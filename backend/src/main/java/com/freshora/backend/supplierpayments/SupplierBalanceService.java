package com.freshora.backend.supplierpayments;

import com.freshora.backend.purchases.PurchaseRepository;
import com.freshora.backend.suppliers.Supplier;
import com.freshora.backend.suppliers.SupplierRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SupplierBalanceService {

    public record Balance(Long supplierId, String name, BigDecimal creditLimit,
                          BigDecimal creditTotal, BigDecimal paidTotal, BigDecimal balance,
                          boolean overLimit, BigDecimal minimumPayment) {}

    private final SupplierRepository suppliers;
    private final PurchaseRepository purchases;
    private final SupplierPaymentRepository payments;

    public SupplierBalanceService(SupplierRepository suppliers, PurchaseRepository purchases,
                                  SupplierPaymentRepository payments) {
        this.suppliers = suppliers;
        this.purchases = purchases;
        this.payments = payments;
    }

    public List<Balance> all() {
        Map<Long, BigDecimal> credit = new HashMap<>();
        purchases.creditBySupplier().forEach(r -> credit.put(r.getSupplierId(), r.getTotal()));
        Map<Long, BigDecimal> paid = new HashMap<>();
        payments.paidBySupplier().forEach(r -> paid.put(r.getSupplierId(), r.getTotal()));

        return suppliers.findAll(Sort.by("name")).stream()
                .map(s -> build(s,
                        credit.getOrDefault(s.getId(), BigDecimal.ZERO),
                        paid.getOrDefault(s.getId(), BigDecimal.ZERO)))
                .toList();
    }

    public Balance forSupplier(Supplier s) {
        return build(s, nz(purchases.creditTotalFor(s.getId())), nz(payments.paidTotalFor(s.getId())));
    }

    private Balance build(Supplier s, BigDecimal credit, BigDecimal paid) {
        BigDecimal balance = credit.subtract(paid);
        BigDecimal limit = s.getCreditLimit();
        boolean over = balance.compareTo(limit) > 0;
        BigDecimal minimum = over ? balance.subtract(limit) : BigDecimal.ZERO;
        return new Balance(s.getId(), s.getName(), limit, credit, paid, balance, over, minimum);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}