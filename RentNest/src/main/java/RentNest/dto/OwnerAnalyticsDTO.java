package RentNest.dto;

import java.time.Instant;
import java.math.BigDecimal;
import java.util.List;

public class OwnerAnalyticsDTO {
    private Instant asOf; // when was this updated
    private String currency; // currency of the analytics data
    private long totalListings;
    private long occupiedListings;
    private long totalViews;
    private long totalRentCollected;
    private long tenantsHosted;
    private long terminations;
    private long reviewCount;
    private BigDecimal averageRating;
    private String averageRatingUnavailableReason;
    private BigDecimal averageTenancyMonths;
    private String averageTenancyUnavailableReason;
    private String monthlyOccupancyUnavailableReason;
    private List<AnalyticsChartPointDTO> monthlyRent;
    private List<AnalyticsChartPointDTO> monthlyOccupancy;
    private List<AnalyticsChartPointDTO> monthlyAcceptedOffers;
    private List<AnalyticsChartPointDTO> monthlyTerminations;
    private List<AnalyticsChartPointDTO> monthlyAverageDaysOnMarket;
    private List<AnalyticsChartPointDTO> tenancyLengths;

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

    public long getTotalListings() {
        return totalListings;
    }

    public void setTotalListings(long totalListings) {
        this.totalListings = totalListings;
    }

    public long getOccupiedListings() {
        return occupiedListings;
    }

    public void setOccupiedListings(long occupiedListings) {
        this.occupiedListings = occupiedListings;
    }

    public long getTotalViews() {
        return totalViews;
    }

    public void setTotalViews(long totalViews) {
        this.totalViews = totalViews;
    }

    public long getTotalRentCollected() {
        return totalRentCollected;
    }

    public void setTotalRentCollected(long totalRentCollected) {
        this.totalRentCollected = totalRentCollected;
    }

    public long getTenantsHosted() {
        return tenantsHosted;
    }

    public void setTenantsHosted(long tenantsHosted) {
        this.tenantsHosted = tenantsHosted;
    }

    public long getTerminations() {
        return terminations;
    }

    public void setTerminations(long terminations) {
        this.terminations = terminations;
    }

    public long getReviewCount() {
        return reviewCount;
    }

    public void setReviewCount(long reviewCount) {
        this.reviewCount = reviewCount;
    }

    public BigDecimal getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(BigDecimal averageRating) {
        this.averageRating = averageRating;
    }

    public String getAverageRatingUnavailableReason() {
        return averageRatingUnavailableReason;
    }

    public void setAverageRatingUnavailableReason(String averageRatingUnavailableReason) {
        this.averageRatingUnavailableReason = averageRatingUnavailableReason;
    }

    public BigDecimal getAverageTenancyMonths() {
        return averageTenancyMonths;
    }

    public void setAverageTenancyMonths(BigDecimal averageTenancyMonths) {
        this.averageTenancyMonths = averageTenancyMonths;
    }

    public String getAverageTenancyUnavailableReason() {
        return averageTenancyUnavailableReason;
    }

    public void setAverageTenancyUnavailableReason(String averageTenancyUnavailableReason) {
        this.averageTenancyUnavailableReason = averageTenancyUnavailableReason;
    }

    public String getMonthlyOccupancyUnavailableReason() {
        return monthlyOccupancyUnavailableReason;
    }

    public void setMonthlyOccupancyUnavailableReason(String monthlyOccupancyUnavailableReason) {
        this.monthlyOccupancyUnavailableReason = monthlyOccupancyUnavailableReason;
    }

    public List<AnalyticsChartPointDTO> getMonthlyRent() {
        return monthlyRent;
    }

    public void setMonthlyRent(List<AnalyticsChartPointDTO> monthlyRent) {
        this.monthlyRent = monthlyRent;
    }

    public List<AnalyticsChartPointDTO> getMonthlyOccupancy() {
        return monthlyOccupancy;
    }

    public void setMonthlyOccupancy(List<AnalyticsChartPointDTO> monthlyOccupancy) {
        this.monthlyOccupancy = monthlyOccupancy;
    }

    public List<AnalyticsChartPointDTO> getMonthlyAcceptedOffers() {
        return monthlyAcceptedOffers;
    }

    public void setMonthlyAcceptedOffers(List<AnalyticsChartPointDTO> monthlyAcceptedOffers) {
        this.monthlyAcceptedOffers = monthlyAcceptedOffers;
    }

    public List<AnalyticsChartPointDTO> getMonthlyTerminations() {
        return monthlyTerminations;
    }

    public void setMonthlyTerminations(List<AnalyticsChartPointDTO> monthlyTerminations) {
        this.monthlyTerminations = monthlyTerminations;
    }

    public List<AnalyticsChartPointDTO> getMonthlyAverageDaysOnMarket() {
        return monthlyAverageDaysOnMarket;
    }

    public void setMonthlyAverageDaysOnMarket(List<AnalyticsChartPointDTO> monthlyAverageDaysOnMarket) {
        this.monthlyAverageDaysOnMarket = monthlyAverageDaysOnMarket;
    }

    public List<AnalyticsChartPointDTO> getTenancyLengths() {
        return tenancyLengths;
    }

    public void setTenancyLengths(List<AnalyticsChartPointDTO> tenancyLengths) {
        this.tenancyLengths = tenancyLengths;
    }
}
