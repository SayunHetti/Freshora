package com.freshora.backend.buyers;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "buyers")
public class Buyer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 20)
    private String type;

    @Column(name = "daily_cash_limit", precision = 12, scale = 2)
    private BigDecimal dailyCashLimit;

    @Column(nullable = false)
    private boolean active = true;

    @Column(columnDefinition = "text")
    private String notes;

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public BigDecimal getDailyCashLimit() { return dailyCashLimit; }
    public void setDailyCashLimit(BigDecimal dailyCashLimit) { this.dailyCashLimit = dailyCashLimit; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}