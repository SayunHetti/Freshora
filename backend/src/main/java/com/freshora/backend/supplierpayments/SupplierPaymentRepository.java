package com.freshora.backend.supplierpayments;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface SupplierPaymentRepository extends JpaRepository<SupplierPayment, Long> {

    interface SupplierSum {
        Long getSupplierId();
        BigDecimal getTotal();
    }

    List<SupplierPayment> findBySupplierIdOrderByPaymentDateDescIdDesc(Long supplierId);

    List<SupplierPayment> findAllByOrderByPaymentDateDescIdDesc();

    @Query("select p.supplierId as supplierId, sum(p.amount) as total from SupplierPayment p group by p.supplierId")
    List<SupplierSum> paidBySupplier();

    @Query("select sum(p.amount) from SupplierPayment p where p.supplierId = :supplierId")
    BigDecimal paidTotalFor(@Param("supplierId") Long supplierId);
}