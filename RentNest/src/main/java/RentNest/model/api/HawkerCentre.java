package RentNest.model.api;

public class HawkerCentre {
    private String nameOfCentre;
    private String locationOfCentre;
    private String typeOfCentre;
    private String owner;
    private int noOfStalls;
    private int noOfCookedFoodStalls;
    private int noOfMktProduceStalls;

    private double latitude;
    private double longitude;

    // Getters and setters
    public String getNameOfCentre() {
        return nameOfCentre;
    }

    public void setNameOfCentre(String nameOfCentre) {
        this.nameOfCentre = nameOfCentre;
    }

    public String getLocationOfCentre() {
        return locationOfCentre;
    }

    public void setLocationOfCentre(String locationOfCentre) {
        this.locationOfCentre = locationOfCentre;
    }

    public String getTypeOfCentre() {
        return typeOfCentre;
    }

    public void setTypeOfCentre(String typeOfCentre) {
        this.typeOfCentre = typeOfCentre;
    }

    public String getOwner() {
        return owner;
    }

    public void setOwner(String owner) {
        this.owner = owner;
    }

    public int getNoOfStalls() {
        return noOfStalls;
    }

    public void setNoOfStalls(int noOfStalls) {
        this.noOfStalls = noOfStalls;
    }

    public int getNoOfCookedFoodStalls() {
        return noOfCookedFoodStalls;
    }

    public void setNoOfCookedFoodStalls(int noOfCookedFoodStalls) {
        this.noOfCookedFoodStalls = noOfCookedFoodStalls;
    }

    public int getNoOfMktProduceStalls() {
        return noOfMktProduceStalls;
    }

    public void setNoOfMktProduceStalls(int noOfMktProduceStalls) {
        this.noOfMktProduceStalls = noOfMktProduceStalls;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }
}
