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
@Table(name = "author", uniqueConstraints = @UniqueConstraint(name = "uq_author_normalized_name", columnNames = "normalized_name"))
public class Author {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, length = 160)
    private String name;
    @Column(name = "normalized_name", nullable = false, length = 160)
    private String normalizedName;

    protected Author() {}
    public Author(String name, String normalizedName) { this.name = name; this.normalizedName = normalizedName; }
    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getNormalizedName() { return normalizedName; }
}
