package RentNest.model.api;

public class RentalContract {
    private double x;
    private double y;
    private String project;
    private String areaSqm;
    private String leaseDate;
    private String propertyType;
    private String district;
    private String areaSqft;
    private String noOfBedRoom;
    private int rent;

    // Getters and setters
    public String getAreaSqm() {
        return areaSqm;
    }

    public void setAreaSqm(String areaSqm) {
        this.areaSqm = areaSqm;
    }

    public String getLeaseDate() {
        return leaseDate;
    }

    public void setLeaseDate(String leaseDate) {
        this.leaseDate = leaseDate;
    }

    public String getPropertyType() {
        return propertyType;
    }

    public void setPropertyType(String propertyType) {
        this.propertyType = propertyType;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getAreaSqft() {
        return areaSqft;
    }

    public void setAreaSqft(String areaSqft) {
        this.areaSqft = areaSqft;
    }

    public String getNoOfBedRoom() {
        return noOfBedRoom;
    }

    public void setNoOfBedRoom(String noOfBedRoom) {
        this.noOfBedRoom = noOfBedRoom;
    }

    public int getRent() {
        return rent;
    }

    public void setRent(int rent) {
        this.rent = rent;
    }

    public double getX() {
        return x;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getY() {
        return y;
    }

    public void setY(double y) {
        this.y = y;
    }

    public String getProject() {
        return project;
    }

    public void setProject(String project) {
        this.project = project;
    }
}
