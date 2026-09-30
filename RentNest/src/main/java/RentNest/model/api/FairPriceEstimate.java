package RentNest.model.api;

import java.util.ArrayList;
import java.util.List;

/**
 * Result of the AI Fair-Pricing Model (AIFPM) for a property.
 *
 * The model produces a single "fair price" (a recency-weighted median of
 * comparable transactions, adjusted to the property) and three bands around it,
 * in the style of a marketplace price guide:
 *
 *   EXCELLENT  within +/-5%  of the fair price
 *   GREAT      within +/-10% of the fair price
 *   GOOD       within +/-15% of the fair price
 *
 * When an asking price is supplied, {@code tier} says which band it falls in
 * (or OUTSIDE_RANGE) and {@code percentDiffFromFair} gives the signed premium.
 */
public class FairPriceEstimate {

    public enum Tier { EXCELLENT, GREAT, GOOD, OUTSIDE_RANGE, INSUFFICIENT_DATA }

    public enum Confidence { LOW, MEDIUM, HIGH, NONE }

    /** One price band around the fair price. */
    public static class PriceTier {
        private Tier name;
        private int tolerancePercent;
        private int low;
        private int high;

        public PriceTier() {}

        public PriceTier(Tier name, int tolerancePercent, int low, int high) {
            this.name = name;
            this.tolerancePercent = tolerancePercent;
            this.low = low;
            this.high = high;
        }

        public Tier getName() { return name; }
        public void setName(Tier name) { this.name = name; }
        public int getTolerancePercent() { return tolerancePercent; }
        public void setTolerancePercent(int tolerancePercent) { this.tolerancePercent = tolerancePercent; }
        public int getLow() { return low; }
        public void setLow(int low) { this.low = low; }
        public int getHigh() { return high; }
        public void setHigh(int high) { this.high = high; }
    }

    private boolean available;
    private Integer fairPrice;
    private List<PriceTier> tiers = new ArrayList<>();
    private Integer askingPrice;
    private Double percentDiffFromFair;
    private Tier tier;
    private Confidence confidence;
    private int comparableCount;
    private String dataSource;
    private String basis;
    private String periodStart;
    private String periodEnd;
    private String sizeAdjustment;
    private String floorAdjustment;
    private String message;
    /** WHOLE_UNIT, MASTER_ROOM or COMMON_ROOM; null when not classified (owner form). */
    private String unitType;
    /** How the unit type was determined: "AI" or "keywords". */
    private String unitTypeSource;
    /** Share of whole-unit rent used for a room (e.g. 0.45); null for a whole unit. */
    private Double rentShare;

    public static FairPriceEstimate unavailable(String dataSource, String basis, String message) {
        FairPriceEstimate e = new FairPriceEstimate();
        e.available = false;
        e.tier = Tier.INSUFFICIENT_DATA;
        e.confidence = Confidence.NONE;
        e.comparableCount = 0;
        e.dataSource = dataSource;
        e.basis = basis;
        e.message = message;
        return e;
    }

    /** Convenience: the widest (GOOD) band's bounds, or null when unavailable. */
    public Integer getGoodLow() { return tiers.isEmpty() ? null : tiers.get(tiers.size() - 1).getLow(); }
    public Integer getGoodHigh() { return tiers.isEmpty() ? null : tiers.get(tiers.size() - 1).getHigh(); }

    // Getters and setters

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }

    public Integer getFairPrice() { return fairPrice; }
    public void setFairPrice(Integer fairPrice) { this.fairPrice = fairPrice; }

    public List<PriceTier> getTiers() { return tiers; }
    public void setTiers(List<PriceTier> tiers) { this.tiers = tiers; }

    public Integer getAskingPrice() { return askingPrice; }
    public void setAskingPrice(Integer askingPrice) { this.askingPrice = askingPrice; }

    public Double getPercentDiffFromFair() { return percentDiffFromFair; }
    public void setPercentDiffFromFair(Double percentDiffFromFair) { this.percentDiffFromFair = percentDiffFromFair; }

    public Tier getTier() { return tier; }
    public void setTier(Tier tier) { this.tier = tier; }

    public Confidence getConfidence() { return confidence; }
    public void setConfidence(Confidence confidence) { this.confidence = confidence; }

    public int getComparableCount() { return comparableCount; }
    public void setComparableCount(int comparableCount) { this.comparableCount = comparableCount; }

    public String getDataSource() { return dataSource; }
    public void setDataSource(String dataSource) { this.dataSource = dataSource; }

    public String getBasis() { return basis; }
    public void setBasis(String basis) { this.basis = basis; }

    public String getPeriodStart() { return periodStart; }
    public void setPeriodStart(String periodStart) { this.periodStart = periodStart; }

    public String getPeriodEnd() { return periodEnd; }
    public void setPeriodEnd(String periodEnd) { this.periodEnd = periodEnd; }

    public String getSizeAdjustment() { return sizeAdjustment; }
    public void setSizeAdjustment(String sizeAdjustment) { this.sizeAdjustment = sizeAdjustment; }

    public String getFloorAdjustment() { return floorAdjustment; }
    public void setFloorAdjustment(String floorAdjustment) { this.floorAdjustment = floorAdjustment; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getUnitType() { return unitType; }
    public void setUnitType(String unitType) { this.unitType = unitType; }

    public String getUnitTypeSource() { return unitTypeSource; }
    public void setUnitTypeSource(String unitTypeSource) { this.unitTypeSource = unitTypeSource; }

    public Double getRentShare() { return rentShare; }
    public void setRentShare(Double rentShare) { this.rentShare = rentShare; }
}
