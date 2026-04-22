package com.pricehawl.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "category")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 200, unique = true)
    private String name;

    @Column(nullable = false, length = 200)
    private String slug;

    // Quan hệ nhiều-một: Nhiều danh mục con thuộc về 1 danh mục cha
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @JsonBackReference // Ngăn chặn vòng lặp JSON khi parse ngược về cha
    private Category parent;

    // Quan hệ một-nhiều: 1 danh mục cha có nhiều danh mục con
    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL)
    @JsonManagedReference // Cho phép parse JSON mảng con
    private List<Category> children = new ArrayList<>();

    // --- GETTER & SETTER ---
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public Category getParent() {
        return parent;
    }

    public void setParent(Category parent) {
        this.parent = parent;
    }

    public List<Category> getChildren() {
        return children;
    }

    public void setChildren(List<Category> children) {
        this.children = children;
    }
}