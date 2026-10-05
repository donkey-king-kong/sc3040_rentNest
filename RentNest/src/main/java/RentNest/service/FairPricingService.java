package RentNest.service;

import RentNest.model.Listings;
import RentNest.model.api.FairPriceEstimate;
import RentNest.model.api.FairPriceEstimate.Confidence;
import RentNest.model.api.FairPriceEstimate.PriceTier;
import RentNest.model.api.FairPriceEstimate.Tier;
import RentNest.model.api.HDBRentalContract;
import RentNest.model.api.RentalContract;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AI Fair-Pricing Model (AIFPM).
 *
 * Estimates a fair market rental range for a property from comparable historical
 * transactions (HDB rental approvals from data.gov.sg, private rental contracts
 * from URA) combined with the listing's own attributes.
 *
 * Model outline:
 *  1. Gather comparables: same flat type on the same street (HDB), or same
 *     project / within a radius (private), same bedroom count.
 *  2. Adjust each comparable to the subject property:
 *       - size: rent scales with (subjectSize / compSize)^0.5, clamped to +/-25%
 *       - floor: +/-0.4% per floor relative to floor 10, clamped to +/-6%
 *  3. Weight each comparable by recency (half-life of 12 months).
 *  4. Trim outliers outside 1.5 x IQR of the adjusted rents.
 *  5. The weighted median of the adjusted rents is the "fair price".
 *  6. Build three bands around it (EXCELLENT +/-5%, GREAT +/-10%, GOOD +/-15%).
 *  7. If an asking price is supplied, report which band it falls in and the
 *     signed percentage difference from the fair price.
 *
 * Room rentals: public datasets only record whole-unit rentals. For existing
 * listings, {@link RoomTypeClassifier} (Gemini, with a keyword fallback) reads the
 * title and description to tell whole units from master and common rooms; rooms
 * are priced from whole-unit comparables scaled by a typical room share.
 */
@Service
public class FairPricingService {

    static final int MIN_COMPARABLES = 3;
    static final double RECENCY_HALF_LIFE_MONTHS = 12.0;
    static final double SIZE_ELASTICITY = 0.5;
    static final double SIZE_ADJ_CLAMP = 0.25;
    static final int REFERENCE_FLOOR = 10;
    static final double FLOOR_ADJ_PER_LEVEL = 0.004;
    static final double FLOOR_ADJ_CLAMP = 0.06;
    /** URA publishes one large file per quarter for all of Singapore; a year keeps downloads reasonable. */
    static final int PRIVATE_YEARS = 1;
    static final double PRIVATE_FALLBACK_RADIUS_M = 500;
    static final double LANDED_RADIUS_M = 1000;
    /** Band tolerances in percent, narrowest first. */
    static final int[] TIER_TOLERANCES = {5, 10, 15};
    /** HDB 4-ROOM and 5-ROOM flats both have 3 bedrooms; use floor area to tell them apart. */
    static final int FIVE_ROOM_MIN_SQFT = 1150;
    /** Comparable transactions are cached briefly so typing in the listing form does not hammer OneMap. */
    static final long CACHE_TTL_MILLIS = 10 * 60 * 1000L;
    /**
     * A room's rent as a share of the whole unit's rent, by property type and the whole
     * unit's bedrooms: {master, common}. Derived June 2026 from national median room
     * rents (Hozuko room-rent snapshot, Jun 2026: HDB master $1,400 / common $900; condo
     * $2,170 / $1,300; landed $1,800 / $1,200) divided by official whole-unit medians for
     * the same period (HDB rental approvals on data.gov.sg, Apr-Jun 2026; URA private
     * rental contracts, 2026 Q2). Room medians are asking rents, whole-unit medians are
     * approved/contracted rents.
     */
    static final double[][] HDB_ROOM_SHARES = {
            {0.49, 0.32}, // 3-ROOM (2 bedrooms) or smaller: whole-flat median $2,850
            {0.41, 0.26}, // 4-ROOM (3 bedrooms): $3,400
            {0.40, 0.26}, // 5-ROOM / EXECUTIVE: $3,500
    };
    static final double[][] CONDO_ROOM_SHARES = {
            {0.52, 0.31}, // 2 bedrooms or fewer: whole-unit median $4,200
            {0.41, 0.25}, // 3 bedrooms: $5,300
            {0.26, 0.16}, // 4+ bedrooms: $8,200
    };
    static final double[] LANDED_ROOM_SHARES = {0.22, 0.15}; // whole-house median $8,000
    static final String ROOM_SHARE_SOURCE = "2026 median room rents (Hozuko) vs official HDB/URA whole-unit medians";
    /** Whole-unit bedrooms assumed for a room listing that does not say (HDB: a 4-ROOM flat). */
    static final int DEFAULT_ROOM_FLAT_BEDROOMS = 3;

    private record CacheEntry(long createdAt, List<ComparableTransaction> comps, String basis) {}
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    static final Tier[] TIER_NAMES = {Tier.EXCELLENT, Tier.GREAT, Tier.GOOD};

    private static final Pattern NUMBER = Pattern.compile("\\d+(?:\\.\\d+)?");

    /** A single historical transaction normalised for the model. */
    public record ComparableTransaction(int rent, Double areaSqft, YearMonth period) {}

    private final ApiService apiService;
    private final ListingsService listingsService;
    /** When true, properties without enough real comparables are priced from simulated demo transactions. */
    private final boolean demoData;
    /** Detects room rentals from listing text; null disables room pricing. */
    private final RoomTypeClassifier roomTypeClassifier;

    public FairPricingService(ApiService apiService, ListingsService listingsService) {
        this(apiService, listingsService, false, null);
    }

    public FairPricingService(ApiService apiService, ListingsService listingsService, boolean demoData) {
        this(apiService, listingsService, demoData, null);
    }

    @Autowired
    public FairPricingService(ApiService apiService, ListingsService listingsService,
                              @Value("${pricing.demo-data.enabled:true}") boolean demoData,
                              RoomTypeClassifier roomTypeClassifier) {
        this.apiService = apiService;
        this.listingsService = listingsService;
        this.demoData = demoData;
        this.roomTypeClassifier = roomTypeClassifier;
    }

    // ---------------------------------------------------------------------
    // Public entry points
    // ---------------------------------------------------------------------

    /** Tenant view: estimate for an existing listing, compared with its asking price. */
    public Optional<FairPriceEstimate> estimateForListing(Long listingId) {
        return listingsService.getListingById(listingId).map(this::estimateForListing);
    }

    /** Estimate for a listing, pricing room rentals as a share of whole-unit rents. */
    public FairPriceEstimate estimateForListing(Listings l) {
        RoomTypeClassifier.Classification c = roomTypeClassifier == null ? null
                : roomTypeClassifier.classify(l.getName(), l.getDescription());
        if (c == null || !c.isRoom()) {
            String flatType = "HDB".equalsIgnoreCase(l.getType())
                    ? hdbFlatTypeForListing(l.getName(), l.getDescription(), l.getBeds(), l.getSize()) : null;
            FairPriceEstimate e = estimate(l.getType(), l.getPostal(), l.getBeds(), l.getSize(), l.getFloor(), l.getPrice(), 1.0, flatType);
            if (c != null) {
                e.setUnitType(c.unitType().name());
                e.setUnitTypeSource(c.source());
            }
            return e;
        }

        boolean master = c.unitType() == RoomTypeClassifier.UnitType.MASTER_ROOM;
        int wholeBeds = c.wholeUnitBedrooms() != null ? c.wholeUnitBedrooms() : DEFAULT_ROOM_FLAT_BEDROOMS;
        double share = roomShare(l.getType(), wholeBeds, master);
        // The listing's own size is the room's, so it is not compared with whole-unit sizes.
        FairPriceEstimate e = estimate(l.getType(), l.getPostal(), wholeBeds, null, l.getFloor(), l.getPrice(), share, null);
        e.setUnitType(c.unitType().name());
        e.setUnitTypeSource(c.source());
        e.setRentShare(share);
        if (e.getBasis() != null) {
            e.setBasis((master ? "master rooms" : "common rooms") + ", priced at " + Math.round(share * 100)
                    + "% of " + e.getBasis());
        }
        return e;
    }

    /** Share of whole-unit rent for a master or common room, by property type and unit bedrooms. */
    static double roomShare(String type, int wholeUnitBedrooms, boolean master) {
        int idx = master ? 0 : 1;
        if ("Landed".equalsIgnoreCase(type)) return LANDED_ROOM_SHARES[idx];
        double[][] table = "HDB".equalsIgnoreCase(type) ? HDB_ROOM_SHARES : CONDO_ROOM_SHARES;
        int row = wholeUnitBedrooms <= 2 ? 0 : wholeUnitBedrooms == 3 ? 1 : 2;
        return table[row][idx];
    }

    /** Owner view: estimate for a property described by its attributes (listing may not exist yet). */
    public FairPriceEstimate estimate(String type, Integer postal, Integer beds, Integer size, Integer floor, Integer askingPrice) {
        return estimate(type, postal, beds, size, floor, askingPrice, 1.0, null);
    }

    /**
     * @param rentShare    fraction of whole-unit rent being priced (1.0 for a whole unit, less for a room)
     * @param hdbFlatTypeOverride HDB flat type to use instead of deriving it from bedrooms (null to derive)
     */
    private FairPriceEstimate estimate(String type, Integer postal, Integer beds, Integer size, Integer floor,
                                       Integer askingPrice, double rentShare, String hdbFlatTypeOverride) {
        if (postal == null || type == null || type.isBlank()) {
            return FairPriceEstimate.unavailable(null, null, "Property type and postal code are required for a price estimate.");
        }
        String postalCode = String.format("%06d", postal);
        String bedsStr = beds == null ? null : Integer.toString(beds);

        try {
            if ("HDB".equalsIgnoreCase(type)) {
                if (beds == null) {
                    return FairPriceEstimate.unavailable("HDB", null, "Number of bedrooms is required for an HDB estimate.");
                }
                String flatType = hdbFlatTypeOverride != null ? hdbFlatTypeOverride : hdbFlatType(beds, size);
                CacheEntry entry = cached("HDB|" + postalCode + "|" + flatType, () -> {
                    List<HDBRentalContract> contracts = apiService.getHDBRentalContractsByFlatType(postalCode, flatType);
                    String basis = contracts.isEmpty()
                            ? flatType + " HDB flats on the same street"
                            : flatType + " HDB flats along " + contracts.get(0).getStreetName();
                    return new CacheEntry(System.currentTimeMillis(), toComparables(contracts), basis);
                });
                // HDB dataset has no floor area, so size adjustment is skipped for HDB.
                return withDemoFallback(computeEstimate(scale(entry.comps(), rentShare), null, floor, askingPrice, "HDB", entry.basis()),
                        type, flatType, postalCode, null, floor, askingPrice, rentShare);
            }

            boolean landed = "Landed".equalsIgnoreCase(type);
            String noOfBedRoom = landed ? "NA" : bedsStr;
            if (noOfBedRoom == null) {
                return FairPriceEstimate.unavailable("URA", null, "Number of bedrooms is required for a private-property estimate.");
            }

            CacheEntry entry = cached("URA|" + postalCode + "|" + noOfBedRoom + "|" + landed, () -> {
                List<RentalContract> contracts = new ArrayList<>();
                String basis;
                if (!landed) {
                    String project = apiService.getProjectNameFromPostalCode(postalCode);
                    boolean hasProject = project != null && !project.isBlank()
                            && !"Address not found".equals(project) && !"NIL".equalsIgnoreCase(project);
                    if (hasProject) {
                        contracts = apiService.getRentalContractsByProject(project, PRIVATE_YEARS, noOfBedRoom);
                    }
                    basis = noOfBedRoom + "-bedroom units in " + (hasProject ? project : "the same project");
                    if (contracts.size() < MIN_COMPARABLES) {
                        contracts = apiService.getRentalContractsNearPostalCode(postalCode, PRIVATE_FALLBACK_RADIUS_M, PRIVATE_YEARS, noOfBedRoom);
                        basis = noOfBedRoom + "-bedroom private units within " + (int) PRIVATE_FALLBACK_RADIUS_M + "m";
                    }
                } else {
                    contracts = apiService.getRentalContractsNearPostalCode(postalCode, LANDED_RADIUS_M, PRIVATE_YEARS, noOfBedRoom);
                    basis = "landed properties within " + (int) LANDED_RADIUS_M + "m";
                }
                return new CacheEntry(System.currentTimeMillis(), toComparablesFromUra(contracts), basis);
            });
            return withDemoFallback(computeEstimate(scale(entry.comps(), rentShare), size, floor, askingPrice, "URA", entry.basis()),
                    type, noOfBedRoom, postalCode, size, floor, askingPrice, rentShare);
        } catch (RuntimeException e) {
            // External data source failure (network, rate limit, missing API key, malformed response).
            if (demoData && beds != null) {
                boolean hdb = "HDB".equalsIgnoreCase(type);
                String unitKey = hdb ? hdbFlatType(beds, size) : "Landed".equalsIgnoreCase(type) ? "NA" : bedsStr;
                return demoEstimate(type, unitKey, postalCode, hdb ? null : size, floor, askingPrice, rentShare);
            }
            return FairPriceEstimate.unavailable(
                    "HDB".equalsIgnoreCase(type) ? "HDB" : "URA", null,
                    "Market data is temporarily unavailable (" + shortError(e) + "). Please try again in a few minutes.");
        }
    }

    /** Replace an insufficient-data result with a demo estimate when demo data is enabled. */
    private FairPriceEstimate withDemoFallback(FairPriceEstimate real, String type, String unitKey, String postalCode,
                                               Integer size, Integer floor, Integer askingPrice, double rentShare) {
        if (!demoData || real.isAvailable()) return real;
        return demoEstimate(type, unitKey, postalCode, size, floor, askingPrice, rentShare);
    }

    /** Estimate from simulated transactions, labelled with data source "DEMO". */
    FairPriceEstimate demoEstimate(String type, String unitKey, String postalCode,
                                   Integer size, Integer floor, Integer askingPrice) {
        return demoEstimate(type, unitKey, postalCode, size, floor, askingPrice, 1.0);
    }

    private FairPriceEstimate demoEstimate(String type, String unitKey, String postalCode,
                                           Integer size, Integer floor, Integer askingPrice, double rentShare) {
        String what = "HDB".equalsIgnoreCase(type) ? unitKey + " HDB rentals"
                : "Landed".equalsIgnoreCase(type) ? "landed-property rentals"
                : unitKey + "-bedroom condo rentals";
        return computeEstimate(scale(DemoTransactionGenerator.generate(type, unitKey, postalCode), rentShare), size, floor, askingPrice,
                "DEMO", "simulated " + what + " (demo data, not real transactions)");
    }

    /**
     * Map a listing's bedroom count to an HDB flat type. HDB counts the living room,
     * so a 3-bedroom flat is a 4-ROOM (or 5-ROOM when large).
     */
    /** HDB flat type for a listing; see {@link ApiService#hdbFlatTypeForListing}. */
    public static String hdbFlatTypeForListing(String name, String description, Integer beds, Integer sizeSqft) {
        return ApiService.hdbFlatTypeForListing(name, description, beds, sizeSqft);
    }

    public static String hdbFlatType(int beds, Integer sizeSqft) {
        if (beds <= 1) return "2-ROOM";
        if (beds == 2) return "3-ROOM";
        if (beds == 3) return (sizeSqft != null && sizeSqft >= FIVE_ROOM_MIN_SQFT) ? "5-ROOM" : "4-ROOM";
        return "EXECUTIVE";
    }

    /** Scale whole-unit rents to the share being priced (a room). */
    static List<ComparableTransaction> scale(List<ComparableTransaction> comps, double share) {
        if (share == 1.0 || comps == null) return comps;
        return comps.stream()
                .map(c -> new ComparableTransaction((int) Math.round(c.rent() * share), c.areaSqft(), c.period()))
                .toList();
    }

    private CacheEntry cached(String key, java.util.function.Supplier<CacheEntry> loader) {
        CacheEntry hit = cache.get(key);
        if (hit != null && System.currentTimeMillis() - hit.createdAt() < CACHE_TTL_MILLIS) return hit;
        CacheEntry fresh = loader.get();
        cache.put(key, fresh);
        return fresh;
    }

    private static String shortError(RuntimeException e) {
        String m = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
        int cut = m.indexOf(':');
        m = cut > 0 ? m.substring(0, cut) : m;
        return m.length() > 60 ? m.substring(0, 60) : m;
    }

    // ---------------------------------------------------------------------
    // Core model (pure, no I/O) - public so it can be unit-tested without network
    // ---------------------------------------------------------------------

    public FairPriceEstimate computeEstimate(List<ComparableTransaction> comps, Integer subjectSize, Integer subjectFloor,
                                      Integer askingPrice, String dataSource, String basis) {
        if (comps == null || comps.size() < MIN_COMPARABLES) {
            FairPriceEstimate e = FairPriceEstimate.unavailable(dataSource, basis,
                    "Not enough comparable transactions to estimate a fair price (need at least " + MIN_COMPARABLES + ").");
            e.setComparableCount(comps == null ? 0 : comps.size());
            e.setAskingPrice(askingPrice);
            return e;
        }

        // --- size adjustment factor (relative to median comparable size) ---
        double sizeFactor = 1.0;
        String sizeNote = "No size adjustment applied.";
        List<Double> knownSizes = comps.stream().map(ComparableTransaction::areaSqft)
                .filter(a -> a != null && a > 0).sorted().toList();
        if (subjectSize != null && subjectSize > 0 && !knownSizes.isEmpty()) {
            double medianCompSize = knownSizes.get(knownSizes.size() / 2);
            double raw = Math.pow(subjectSize / medianCompSize, SIZE_ELASTICITY);
            sizeFactor = clamp(raw, 1 - SIZE_ADJ_CLAMP, 1 + SIZE_ADJ_CLAMP);
            sizeNote = String.format("%+.1f%% for %d sqft vs typical %d sqft", (sizeFactor - 1) * 100, subjectSize, Math.round(medianCompSize));
        }

        // --- floor adjustment factor ---
        double floorFactor = 1.0;
        String floorNote = "No floor adjustment applied.";
        if (subjectFloor != null && subjectFloor > 0) {
            double raw = 1 + (subjectFloor - REFERENCE_FLOOR) * FLOOR_ADJ_PER_LEVEL;
            floorFactor = clamp(raw, 1 - FLOOR_ADJ_CLAMP, 1 + FLOOR_ADJ_CLAMP);
            floorNote = String.format("%+.1f%% for floor %d", (floorFactor - 1) * 100, subjectFloor);
        }

        // --- build weighted, adjusted samples ---
        YearMonth now = YearMonth.now();
        List<double[]> samples = new ArrayList<>(); // [adjustedRent, weight]
        YearMonth earliest = null, latest = null;
        for (ComparableTransaction c : comps) {
            if (c.rent() <= 0) continue;
            double adjusted = c.rent() * sizeFactor * floorFactor;
            double weight = 0.5;
            if (c.period() != null) {
                long monthsAgo = Math.max(0, ChronoUnit.MONTHS.between(c.period(), now));
                weight = Math.pow(0.5, monthsAgo / RECENCY_HALF_LIFE_MONTHS);
                if (earliest == null || c.period().isBefore(earliest)) earliest = c.period();
                if (latest == null || c.period().isAfter(latest)) latest = c.period();
            }
            samples.add(new double[]{adjusted, weight});
        }
        if (samples.size() < MIN_COMPARABLES) {
            return computeEstimate(List.of(), subjectSize, subjectFloor, askingPrice, dataSource, basis);
        }
        samples.sort(Comparator.comparingDouble(s -> s[0]));

        // --- outlier trim (1.5 x IQR) ---
        double q1 = weightedPercentile(samples, 0.25);
        double q3 = weightedPercentile(samples, 0.75);
        double iqr = q3 - q1;
        List<double[]> trimmed = samples.stream()
                .filter(s -> s[0] >= q1 - 1.5 * iqr && s[0] <= q3 + 1.5 * iqr)
                .toList();
        if (trimmed.size() >= MIN_COMPARABLES) {
            samples = trimmed;
        }

        int fair = roundTo10(weightedPercentile(samples, 0.50));

        FairPriceEstimate e = new FairPriceEstimate();
        e.setAvailable(true);
        e.setFairPrice(fair);
        List<PriceTier> tiers = new ArrayList<>();
        for (int i = 0; i < TIER_TOLERANCES.length; i++) {
            double tol = TIER_TOLERANCES[i] / 100.0;
            tiers.add(new PriceTier(TIER_NAMES[i], TIER_TOLERANCES[i],
                    roundTo10(fair * (1 - tol)), roundTo10(fair * (1 + tol))));
        }
        e.setTiers(tiers);
        e.setComparableCount(samples.size());
        e.setDataSource(dataSource);
        e.setBasis(basis);
        e.setPeriodStart(earliest == null ? null : earliest.toString());
        e.setPeriodEnd(latest == null ? null : latest.toString());
        e.setSizeAdjustment(sizeNote);
        e.setFloorAdjustment(floorNote);
        e.setConfidence(samples.size() >= 15 ? Confidence.HIGH : samples.size() >= 8 ? Confidence.MEDIUM : Confidence.LOW);
        e.setAskingPrice(askingPrice);

        if (askingPrice != null && askingPrice > 0 && fair > 0) {
            double pct = (askingPrice - fair) * 100.0 / fair;
            e.setPercentDiffFromFair(Math.round(pct * 10) / 10.0);
            e.setTier(classify(askingPrice, tiers));
            e.setMessage(tierMessage(e.getTier(), pct));
        } else {
            e.setTier(null);
            e.setMessage("Fair price based on " + samples.size() + " comparable transactions.");
        }
        return e;
    }

    /** Narrowest band containing the price, or OUTSIDE_RANGE. */
    static Tier classify(int price, List<PriceTier> tiers) {
        for (PriceTier t : tiers) {
            if (price >= t.getLow() && price <= t.getHigh()) return t.getName();
        }
        return Tier.OUTSIDE_RANGE;
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    static List<ComparableTransaction> toComparables(List<HDBRentalContract> contracts) {
        List<ComparableTransaction> out = new ArrayList<>();
        for (HDBRentalContract c : contracts) {
            out.add(new ComparableTransaction(c.getMonthlyRent(), null, parseYearMonth(c.getRentApprovalDate())));
        }
        return out;
    }

    static List<ComparableTransaction> toComparablesFromUra(List<RentalContract> contracts) {
        List<ComparableTransaction> out = new ArrayList<>();
        for (RentalContract c : contracts) {
            out.add(new ComparableTransaction(c.getRent(), parseAreaSqft(c.getAreaSqft()), parseYearMonth(c.getLeaseDate())));
        }
        return out;
    }

    /** URA reports floor area as a band such as "1000-1100" or ">3000"; use the midpoint of the numbers found. */
    public static Double parseAreaSqft(String area) {
        if (area == null) return null;
        Matcher m = NUMBER.matcher(area);
        double sum = 0; int n = 0;
        while (m.find()) { sum += Double.parseDouble(m.group()); n++; }
        return n == 0 ? null : sum / n;
    }

    public static YearMonth parseYearMonth(String s) {
        if (s == null || s.length() < 7) return null;
        try {
            return YearMonth.parse(s.substring(0, 7));
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /** Weighted percentile over samples sorted ascending by value. */
    static double weightedPercentile(List<double[]> sorted, double p) {
        double total = 0;
        for (double[] s : sorted) total += s[1];
        double target = p * total;
        double cum = 0;
        for (double[] s : sorted) {
            cum += s[1];
            if (cum >= target) return s[0];
        }
        return sorted.get(sorted.size() - 1)[0];
    }

    private static int roundTo10(double v) {
        return (int) (Math.round(v / 10.0) * 10);
    }

    private static double clamp(double v, double lo, double hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    private static String tierMessage(Tier t, double pct) {
        String diff = String.format("%.0f%% %s", Math.abs(pct), pct >= 0 ? "above" : "below");
        return switch (t) {
            case EXCELLENT -> "Excellent price: within 5% of the fair market rent (" + diff + ").";
            case GREAT -> "Great price: within 10% of the fair market rent (" + diff + ").";
            case GOOD -> "Good price: within 15% of the fair market rent (" + diff + ").";
            case OUTSIDE_RANGE -> "Asking price is " + diff + " the fair market rent, outside the typical range.";
            default -> "";
        };
    }
}
