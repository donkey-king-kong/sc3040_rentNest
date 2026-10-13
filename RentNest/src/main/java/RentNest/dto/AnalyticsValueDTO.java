package RentNest.dto;

import java.math.BigDecimal;

public class AnalyticsValueDTO {
    private BigDecimal value;
    private String unavailableReason;

    public BigDecimal getValue() {
        return value;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public String getUnavailableReason() {
        return unavailableReason;
    }

    public void setUnavailableReason(String unavailableReason) {
        this.unavailableReason = unavailableReason;
    }
}
