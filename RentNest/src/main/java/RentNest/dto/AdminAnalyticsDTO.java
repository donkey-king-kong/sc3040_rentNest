package RentNest.dto;

import java.time.Instant;
import java.util.List;

public class AdminAnalyticsDTO {
    private Instant asOf; // when was this updated
    private String currency; // currency of the analytics data
    private long registeredUsers;
    private long totalListings;
    private long totalRentCollected;
    private long totalRentalOffers;
    private long pendingRentals;
    private long activeRentals;
    private long upcomingRentals;
    private long expiredRentals;
    private long terminatedRentals;
    private long unclassifiedRentals;
    private long propertyOwners;
    private long currentTenants;
    private long expiredTenants;
    private long terminatedTenants;
    private long blockedUsers;
    private List<AnalyticsChartPointDTO> monthlyRent;
    private List<AnalyticsChartPointDTO> monthlyAcceptedOffers;
    private List<AnalyticsChartPointDTO> monthlyTerminations;
    private List<AnalyticsChartPointDTO> monthlyAverageDaysOnMarket;

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

    public long getRegisteredUsers() {
        return registeredUsers;
    }

    public void setRegisteredUsers(long registeredUsers) {
        this.registeredUsers = registeredUsers;
    }

    public long getTotalListings() {
        return totalListings;
    }

    public void setTotalListings(long totalListings) {
        this.totalListings = totalListings;
    }

    public long getTotalRentCollected() {
        return totalRentCollected;
    }

    public void setTotalRentCollected(long totalRentCollected) {
        this.totalRentCollected = totalRentCollected;
    }

    public long getTotalRentalOffers() {
        return totalRentalOffers;
    }

    public void setTotalRentalOffers(long totalRentalOffers) {
        this.totalRentalOffers = totalRentalOffers;
    }

    public long getPendingRentals() {
        return pendingRentals;
    }

    public void setPendingRentals(long pendingRentals) {
        this.pendingRentals = pendingRentals;
    }

    public long getActiveRentals() {
        return activeRentals;
    }

    public void setActiveRentals(long activeRentals) {
        this.activeRentals = activeRentals;
    }

    public long getUpcomingRentals() {
        return upcomingRentals;
    }

    public void setUpcomingRentals(long upcomingRentals) {
        this.upcomingRentals = upcomingRentals;
    }

    public long getExpiredRentals() {
        return expiredRentals;
    }

    public void setExpiredRentals(long expiredRentals) {
        this.expiredRentals = expiredRentals;
    }

    public long getTerminatedRentals() {
        return terminatedRentals;
    }

    public void setTerminatedRentals(long terminatedRentals) {
        this.terminatedRentals = terminatedRentals;
    }

    public long getUnclassifiedRentals() {
        return unclassifiedRentals;
    }

    public void setUnclassifiedRentals(long unclassifiedRentals) {
        this.unclassifiedRentals = unclassifiedRentals;
    }

    public long getPropertyOwners() {
        return propertyOwners;
    }

    public void setPropertyOwners(long propertyOwners) {
        this.propertyOwners = propertyOwners;
    }

    public long getCurrentTenants() {
        return currentTenants;
    }

    public void setCurrentTenants(long currentTenants) {
        this.currentTenants = currentTenants;
    }

    public long getExpiredTenants() {
        return expiredTenants;
    }

    public void setExpiredTenants(long expiredTenants) {
        this.expiredTenants = expiredTenants;
    }

    public long getTerminatedTenants() {
        return terminatedTenants;
    }

    public void setTerminatedTenants(long terminatedTenants) {
        this.terminatedTenants = terminatedTenants;
    }

    public long getBlockedUsers() {
        return blockedUsers;
    }

    public void setBlockedUsers(long blockedUsers) {
        this.blockedUsers = blockedUsers;
    }

    public List<AnalyticsChartPointDTO> getMonthlyRent() {
        return monthlyRent;
    }

    public void setMonthlyRent(List<AnalyticsChartPointDTO> monthlyRent) {
        this.monthlyRent = monthlyRent;
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
}
