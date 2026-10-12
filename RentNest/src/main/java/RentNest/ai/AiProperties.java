package RentNest.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Settings for the OpenRouter-backed features. Every value has a usable default so the
 * application still starts, and every AI feature still degrades to its rule-based path,
 * when no API key is configured.
 */
@Component
@ConfigurationProperties(prefix = "rentnest.ai")
public class AiProperties {
    private boolean enabled = true;
    private String apiKey = "";
    private String baseUrl = "https://openrouter.ai/api/v1";
    /** Sent as HTTP-Referer / X-Title so usage is attributable on the OpenRouter dashboard. */
    private String appUrl = "https://github.com/rentnest/rentnest";
    private String appName = "RentNest";
    private int connectTimeoutMs = 3000;
    private int readTimeoutMs = 9000;

    private final Filter filter = new Filter();
    private final Sorting sorting = new Sorting();
    private final Summary summary = new Summary();

    /** Pillar 1: natural-language search text to structured filters. */
    public static class Filter {
        private boolean enabled = true;
        private String model = "google/gemini-2.5-flash-lite";
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getModel() { return model; }
        public void setModel(String model) { this.model = model; }
    }

    /** Pillar 2: re-rank of the top deterministic candidates. */
    public static class Sorting {
        private boolean enabled = true;
        private String model = "google/gemini-2.5-flash-lite";
        /** Only this many top-scoring listings are sent to the model. */
        private int candidates = 20;
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getModel() { return model; }
        public void setModel(String model) { this.model = model; }
        public int getCandidates() { return candidates; }
        public void setCandidates(int candidates) { this.candidates = candidates; }
    }

    /** Pillar 3: cached per-listing summaries. */
    public static class Summary {
        private boolean enabled = true;
        private String model = "google/gemini-2.5-flash";
        /** Nearby schools, bus stops and hawker centres are slow to fetch; off by default. */
        private boolean includeAmenities = false;
        private double amenityRadiusMeters = 1000;
        /** Upper bound on listings queued for background generation at any one time. */
        private int maxPending = 40;
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getModel() { return model; }
        public void setModel(String model) { this.model = model; }
        public boolean isIncludeAmenities() { return includeAmenities; }
        public void setIncludeAmenities(boolean includeAmenities) { this.includeAmenities = includeAmenities; }
        public double getAmenityRadiusMeters() { return amenityRadiusMeters; }
        public void setAmenityRadiusMeters(double amenityRadiusMeters) { this.amenityRadiusMeters = amenityRadiusMeters; }
        public int getMaxPending() { return maxPending; }
        public void setMaxPending(int maxPending) { this.maxPending = maxPending; }
    }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    public String getAppUrl() { return appUrl; }
    public void setAppUrl(String appUrl) { this.appUrl = appUrl; }
    public String getAppName() { return appName; }
    public void setAppName(String appName) { this.appName = appName; }
    public int getConnectTimeoutMs() { return connectTimeoutMs; }
    public void setConnectTimeoutMs(int connectTimeoutMs) { this.connectTimeoutMs = connectTimeoutMs; }
    public int getReadTimeoutMs() { return readTimeoutMs; }
    public void setReadTimeoutMs(int readTimeoutMs) { this.readTimeoutMs = readTimeoutMs; }
    public Filter getFilter() { return filter; }
    public Sorting getSorting() { return sorting; }
    public Summary getSummary() { return summary; }
}
