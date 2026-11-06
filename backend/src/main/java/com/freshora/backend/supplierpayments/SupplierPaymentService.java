package com.freshora.backend.supplierpayments;

import com.freshora.backend.suppliers.SupplierRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Service
public class SupplierPaymentService {

    public record PaymentRequest(Long supplierId, LocalDate paymentDate, BigDecimal amount,
                                 String method, String notes) {}

    // To add a payment method later, just add it here.
    private static final Set<String> METHODS = Set.of("CASH", "BANK_TRANSFER", "CHEQUE");

    private final SupplierPaymentRepository repo;
    private final SupplierRepository suppliers;

    public SupplierPaymentService(SupplierPaymentRepository repo, SupplierRepository suppliers) {
        this.repo = repo;
        this.suppliers = suppliers;
    }

    public List<SupplierPayment> list(Long supplierId) {
        return supplierId == null
                ? repo.findAllByOrderByPaymentDateDescIdDesc()
                : repo.findBySupplierIdOrderByPaymentDateDescIdDesc(supplierId);
    }

    public SupplierPayment get(Long id) {
        return repo.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
    }

    public SupplierPayment create(PaymentRequest req) {
        SupplierPayment p = new SupplierPayment();
        apply(p, req);
        return repo.save(p);
    }

    public SupplierPayment update(Long id, PaymentRequest req) {
        SupplierPayment p = get(id);
        apply(p, req);
        return repo.save(p);
    }

    public void delete(Long id) {
        repo.delete(get(id));
    }

    private void apply(SupplierPayment p, PaymentRequest req) {
        if (req.supplierId() == null || !suppliers.existsById(req.supplierId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid supplier");
        }
        if (req.amount() == null || req.amount().signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be more than 0");
        }
        String method = req.method() == null ? "" : req.method().trim().toUpperCase();
        if (!METHODS.contains(method)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Method must be one of " + METHODS);
        }
        p.setSupplierId(req.supplierId());
        p.setPaymentDate(req.paymentDate() == null ? LocalDate.now() : req.paymentDate());
        p.setAmount(req.amount());
        p.setMethod(method);
        p.setNotes(req.notes());
    }
}