CREATE TABLE IF NOT EXISTS postal_code_coordinates (
    postal_code CHAR(6) PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'onemap_2020',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS listing_nearby_amenities (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES listings(listingid) ON DELETE CASCADE,
    amenity_type VARCHAR(30) NOT NULL,
    amenity_ref VARCHAR(100),
    name VARCHAR(255),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    distance_meters DOUBLE PRECISION NOT NULL,
    rank INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_listing_nearby_amenity_rank UNIQUE (listing_id, amenity_type, rank)
);

CREATE INDEX IF NOT EXISTS idx_listing_nearby_amenities_listing_id
    ON listing_nearby_amenities (listing_id);
