CREATE TABLE IF NOT EXISTS search_history (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    keyword VARCHAR(255) NOT NULL,
    searched_at TIMESTAMP
);