package com.freshora.backend.cash;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface BuyerCashLogRepository
        extends JpaRepository<BuyerCashLog, Long>, JpaSpecificationExecutor<BuyerCashLog> {

    interface BuyerSum {
        Long getBuyerId();
        BigDecimal getTotal();
    }

    /** Cash already given to this buyer on this date, ignoring one entry (used when editing). */
    @Query("select sum(c.amount) from BuyerCashLog c " +
           "where c.buyerId = :buyerId and c.logDate = :date and c.id <> :selfId")
    BigDecimal givenOnDate(@Param("buyerId") Long buyerId, @Param("date") LocalDate date,
                           @Param("selfId") Long selfId);

    @Query("select c.buyerId as buyerId, sum(c.amount) as total from BuyerCashLog c " +
           "where c.logDate = :date group by c.buyerId")
    List<BuyerSum> sumsByBuyer(@Param("date") LocalDate date);
}