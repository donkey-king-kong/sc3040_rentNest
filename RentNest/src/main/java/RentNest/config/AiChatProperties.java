package RentNest.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "llm")
public class AiChatProperties {
    private String apiKey = "";
    private String provider = "gemini";
    private String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models";
    private String model = "gemini-3.6-flash";
    private String fallbackModel = "gemini-3.5-flash-lite";
    private int connectTimeoutMs = 5_000;
    private int primaryTimeoutMs = 25_000;
    private int fallbackTimeoutMs = 10_000;
    private int retryBackoffMs = 300;
    private long summaryCacheTtlMs = 600_000;
    private int summaryChunkMessageLimit = 100;
    private int summaryChunkCharacterLimit = 12_000;

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getApiUrl() { return apiUrl; }
    public void setApiUrl(String apiUrl) { this.apiUrl = apiUrl; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getFallbackModel() { return fallbackModel; }
    public void setFallbackModel(String fallbackModel) { this.fallbackModel = fallbackModel; }
    public int getConnectTimeoutMs() { return connectTimeoutMs; }
    public void setConnectTimeoutMs(int connectTimeoutMs) { this.connectTimeoutMs = connectTimeoutMs; }
    public int getPrimaryTimeoutMs() { return primaryTimeoutMs; }
    public void setPrimaryTimeoutMs(int primaryTimeoutMs) { this.primaryTimeoutMs = primaryTimeoutMs; }
    public int getFallbackTimeoutMs() { return fallbackTimeoutMs; }
    public void setFallbackTimeoutMs(int fallbackTimeoutMs) { this.fallbackTimeoutMs = fallbackTimeoutMs; }
    public int getRetryBackoffMs() { return retryBackoffMs; }
    public void setRetryBackoffMs(int retryBackoffMs) { this.retryBackoffMs = retryBackoffMs; }
    public long getSummaryCacheTtlMs() { return summaryCacheTtlMs; }
    public void setSummaryCacheTtlMs(long summaryCacheTtlMs) { this.summaryCacheTtlMs = summaryCacheTtlMs; }
    public int getSummaryChunkMessageLimit() { return summaryChunkMessageLimit; }
    public void setSummaryChunkMessageLimit(int summaryChunkMessageLimit) { this.summaryChunkMessageLimit = summaryChunkMessageLimit; }
    public int getSummaryChunkCharacterLimit() { return summaryChunkCharacterLimit; }
    public void setSummaryChunkCharacterLimit(int summaryChunkCharacterLimit) { this.summaryChunkCharacterLimit = summaryChunkCharacterLimit; }
}
