package com.pricehawl.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "search_history")
public class SearchHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userId;

    @Column(nullable = false)
    private String keyword;

    private LocalDateTime searchedAt;

    public Long getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getKeyword() {
        return keyword;
    }

    public LocalDateTime getSearchedAt() {
        return searchedAt;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public void setSearchedAt(LocalDateTime searchedAt) {
        this.searchedAt = searchedAt;
    }
}