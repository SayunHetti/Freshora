package com.freshora.backend.cash;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface BuyerCashReturnRepository
        extends JpaRepository<BuyerCashReturn, Long>, JpaSpecificationExecutor<BuyerCashReturn> {

    interface BuyerSum {
        Long getBuyerId();
        BigDecimal getTotal();
    }

    @Query("select r.buyerId as buyerId, sum(r.amount) as total from BuyerCashReturn r " +
           "where r.returnDate = :date group by r.buyerId")
    List<BuyerSum> sumsByBuyer(@Param("date") LocalDate date);
}