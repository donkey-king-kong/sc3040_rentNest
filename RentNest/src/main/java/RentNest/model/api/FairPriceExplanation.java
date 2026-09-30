package RentNest.model.api;

/**
 * Plain-English explanation of a listing's AI fair-price verdict, written by an LLM
 * from the model's numbers and the owner's listing description.
 */
public class FairPriceExplanation {

    private boolean available;
    private String explanation;
    private String model;
    private String message;

    public static FairPriceExplanation of(String explanation, String model) {
        FairPriceExplanation e = new FairPriceExplanation();
        e.available = true;
        e.explanation = explanation;
        e.model = model;
        return e;
    }

    public static FairPriceExplanation unavailable(String message) {
        FairPriceExplanation e = new FairPriceExplanation();
        e.available = false;
        e.message = message;
        return e;
    }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }

    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
