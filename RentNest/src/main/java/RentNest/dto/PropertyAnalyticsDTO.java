package RentNest.dto;

import java.time.Instant;
import java.math.BigDecimal;
import java.util.List;

public class PropertyAnalyticsDTO {
    private Instant asOf; // when was this updated
    private String currency; // currency of the analytics data
    private Long listingId;
    private String name;
    private String type;
    private String location;
    private String listingPicture;
    private String occupancyStatus;
    private Integer price;
    private Instant listedAt;
    private Instant firstAcceptedAt;
    private long totalRentalOffers;
    private long acceptedOffers;
    private long tenantsHosted;
    private long rentCollected;
    private long paymentCount;
    private long totalViews;
    private long uniqueViewers;
    private BigDecimal acceptanceRate;
    private BigDecimal averageTenancyMonths;
    private BigDecimal occupancyRate;
    private BigDecimal daysOnMarket;
    private String acceptanceRateUnavailableReason;
    private String averageTenancyUnavailableReason;
    private String daysOnMarketUnavailableReason;
    private List<AnalyticsChartPointDTO> monthlyRent;
    private List<AnalyticsStatusPointDTO> monthlyOccupancy;

    public Instant getAsOf() {
        return asOf;
    }

    public void setAsOf(Instant asOf) {
        this.asOf = asOf;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public Long getListingId() {
        return listingId;
    }

    public void setListingId(Long listingId) {
        this.listingId = listingId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getListingPicture() {
        return listingPicture;
    }

    public void setListingPicture(String listingPicture) {
        this.listingPicture = listingPicture;
    }

    public String getOccupancyStatus() {
        return occupancyStatus;
    }

    public void setOccupancyStatus(String occupancyStatus) {
        this.occupancyStatus = occupancyStatus;
    }

    public Integer getPrice() {
        return price;
    }

    public void setPrice(Integer price) {
        this.price = price;
    }

    public Instant getListedAt() {
        return listedAt;
    }

    public void setListedAt(Instant listedAt) {
        this.listedAt = listedAt;
    }

    public Instant getFirstAcceptedAt() {
        return firstAcceptedAt;
    }

    public void setFirstAcceptedAt(Instant firstAcceptedAt) {
        this.firstAcceptedAt = firstAcceptedAt;
    }

    public long getTotalRentalOffers() {
        return totalRentalOffers;
    }

    public void setTotalRentalOffers(long totalRentalOffers) {
        this.totalRentalOffers = totalRentalOffers;
    }

    public long getAcceptedOffers() {
        return acceptedOffers;
    }

    public void setAcceptedOffers(long acceptedOffers) {
        this.acceptedOffers = acceptedOffers;
    }

    public long getTenantsHosted() {
        return tenantsHosted;
    }

    public void setTenantsHosted(long tenantsHosted) {
        this.tenantsHosted = tenantsHosted;
    }

    public long getRentCollected() {
        return rentCollected;
    }

    public void setRentCollected(long rentCollected) {
        this.rentCollected = rentCollected;
    }

    public long getPaymentCount() {
        return paymentCount;
    }

    public void setPaymentCount(long paymentCount) {
        this.paymentCount = paymentCount;
    }

    public long getTotalViews() {
        return totalViews;
    }

    public void setTotalViews(long totalViews) {
        this.totalViews = totalViews;
    }

    public long getUniqueViewers() {
        return uniqueViewers;
    }

    public void setUniqueViewers(long uniqueViewers) {
        this.uniqueViewers = uniqueViewers;
    }

    public BigDecimal getAcceptanceRate() {
        return acceptanceRate;
    }

    public void setAcceptanceRate(BigDecimal acceptanceRate) {
        this.acceptanceRate = acceptanceRate;
    }

    public BigDecimal getAverageTenancyMonths() {
        return averageTenancyMonths;
    }

    public void setAverageTenancyMonths(BigDecimal averageTenancyMonths) {
        this.averageTenancyMonths = averageTenancyMonths;
    }

    public BigDecimal getOccupancyRate() {
        return occupancyRate;
    }

    public void setOccupancyRate(BigDecimal occupancyRate) {
        this.occupancyRate = occupancyRate;
    }

    public BigDecimal getDaysOnMarket() {
        return daysOnMarket;
    }

    public void setDaysOnMarket(BigDecimal daysOnMarket) {
        this.daysOnMarket = daysOnMarket;
    }

    public String getAcceptanceRateUnavailableReason() {
        return acceptanceRateUnavailableReason;
    }

    public void setAcceptanceRateUnavailableReason(String acceptanceRateUnavailableReason) {
        this.acceptanceRateUnavailableReason = acceptanceRateUnavailableReason;
    }

    public String getAverageTenancyUnavailableReason() {
        return averageTenancyUnavailableReason;
    }

    public void setAverageTenancyUnavailableReason(String averageTenancyUnavailableReason) {
        this.averageTenancyUnavailableReason = averageTenancyUnavailableReason;
    }

    public String getDaysOnMarketUnavailableReason() {
        return daysOnMarketUnavailableReason;
    }

    public void setDaysOnMarketUnavailableReason(String daysOnMarketUnavailableReason) {
        this.daysOnMarketUnavailableReason = daysOnMarketUnavailableReason;
    }

    public List<AnalyticsChartPointDTO> getMonthlyRent() {
        return monthlyRent;
    }

    public void setMonthlyRent(List<AnalyticsChartPointDTO> monthlyRent) {
        this.monthlyRent = monthlyRent;
    }

    public List<AnalyticsStatusPointDTO> getMonthlyOccupancy() {
        return monthlyOccupancy;
    }

    public void setMonthlyOccupancy(List<AnalyticsStatusPointDTO> monthlyOccupancy) {
        this.monthlyOccupancy = monthlyOccupancy;
    }
}
