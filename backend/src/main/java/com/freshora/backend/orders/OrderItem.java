package com.freshora.backend.orders;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal quantity;

    @Column(name = "delivered_quantity", precision = 12, scale = 3)
    private BigDecimal deliveredQuantity;

    @Column(columnDefinition = "text")
    private String notes;

    public Long getId() { return id; }
    public Long getItemId() { return itemId; }
    public void setItemId(Long itemId) { this.itemId = itemId; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public BigDecimal getDeliveredQuantity() { return deliveredQuantity; }
    public void setDeliveredQuantity(BigDecimal deliveredQuantity) { this.deliveredQuantity = deliveredQuantity; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}