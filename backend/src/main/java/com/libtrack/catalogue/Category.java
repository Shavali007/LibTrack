package com.libtrack.catalogue;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.UUID;

@Entity
@Table(name = "category", uniqueConstraints = @UniqueConstraint(name = "uq_category_normalized_name", columnNames = "normalized_name"))
public class Category {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(name = "normalized_name", nullable = false, length = 100)
    private String normalizedName;

    protected Category() {}
    public Category(String name, String normalizedName) { this.name = name; this.normalizedName = normalizedName; }
    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getNormalizedName() { return normalizedName; }
}
