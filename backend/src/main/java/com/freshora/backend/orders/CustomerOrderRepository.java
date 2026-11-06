package com.freshora.backend.orders;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface CustomerOrderRepository
        extends JpaRepository<CustomerOrder, Long>, JpaSpecificationExecutor<CustomerOrder> {

    interface ShoppingRow {
        Long getItemId();
        BigDecimal getTotal();
    }

    @Query("""
        select i.itemId as itemId, sum(i.quantity) as total
        from CustomerOrder o join o.items i
        where o.deliveryDate = :date and o.status <> 'CANCELLED'
        group by i.itemId
        """)
    List<ShoppingRow> shoppingList(@Param("date") LocalDate date);
}