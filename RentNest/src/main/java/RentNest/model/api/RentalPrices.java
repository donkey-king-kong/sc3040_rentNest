package RentNest.model.api;

public class RentalPrices {
    private String leaseDate;
    private int rentPrice;

    public RentalPrices(String leaseDate, int rentPrice) {
        this.leaseDate = leaseDate;
        this.rentPrice = rentPrice;
    }

    public String getleaseDate() {
        return leaseDate;
    }

    public void setleaseDate(String leaseDate) {
        this.leaseDate = leaseDate;
    }

    public int getRentPrice() {
        return rentPrice;
    }

    public void setRentPrice(int rentPrice) {
        this.rentPrice = rentPrice;
    }
}
