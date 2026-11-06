package com.freshora.backend.purchases;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface PurchaseRepository
        extends JpaRepository<Purchase, Long>, JpaSpecificationExecutor<Purchase> {

    interface SupplierSum {
        Long getSupplierId();
        BigDecimal getTotal();
    }

    interface BuyerTypeSum {
        Long getBuyerId();
        String getPaymentType();
        BigDecimal getTotal();
    }

    @Query("select p.supplierId as supplierId, sum(p.total) as total from Purchase p " +
           "where p.paymentType = 'CREDIT' group by p.supplierId")
    List<SupplierSum> creditBySupplier();

    @Query("select sum(p.total) from Purchase p where p.supplierId = :supplierId and p.paymentType = 'CREDIT'")
    BigDecimal creditTotalFor(@Param("supplierId") Long supplierId);

    @Query("select p.buyerId as buyerId, p.paymentType as paymentType, sum(p.total) as total " +
           "from Purchase p where p.purchaseDate = :date group by p.buyerId, p.paymentType")
    List<BuyerTypeSum> sumsByBuyer(@Param("date") LocalDate date);
}