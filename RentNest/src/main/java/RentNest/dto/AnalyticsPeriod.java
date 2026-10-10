package RentNest.dto;

import java.time.Instant;

public class AnalyticsPeriod {
    private Instant from;
    private Instant to;

    public Instant getFrom() {
        return from;
    }

    public void setFrom(Instant from) {
        this.from = from;
    }

    public Instant getTo() {
        return to;
    }

    public void setTo(Instant to) {
        this.to = to;
    }
}
