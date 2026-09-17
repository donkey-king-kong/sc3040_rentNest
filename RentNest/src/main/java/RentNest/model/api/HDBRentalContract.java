package RentNest.model.api;

public class HDBRentalContract {
    private String rentApprovalDate;
    private String town;
    private String block;
    private String streetName;
    private String flatType;
    private int monthlyRent;

    // Getters and setters
    public String getRentApprovalDate() {
        return rentApprovalDate;
    }

    public void setRentApprovalDate(String rentApprovalDate) {
        this.rentApprovalDate = rentApprovalDate;
    }

    public String getTown() {
        return town;
    }

    public void setTown(String town) {
        this.town = town;
    }

    public String getBlock() {
        return block;
    }

    public void setBlock(String block) {
        this.block = block;
    }

    public String getStreetName() {
        return streetName;
    }

    public void setStreetName(String streetName) {
        this.streetName = streetName;
    }

    public String getFlatType() {
        return flatType;
    }

    public void setFlatType(String flatType) {
        this.flatType = flatType;
    }

    public int getMonthlyRent() {
        return monthlyRent;
    }

    public void setMonthlyRent(int monthlyRent) {
        this.monthlyRent = monthlyRent;
    }
}
