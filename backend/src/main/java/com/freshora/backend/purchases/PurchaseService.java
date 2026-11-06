package com.freshora.backend.purchases;

import com.freshora.backend.buyers.BuyerRepository;
import com.freshora.backend.items.ItemRepository;
import com.freshora.backend.supplierpayments.SupplierBalanceService;
import com.freshora.backend.suppliers.Supplier;
import com.freshora.backend.suppliers.SupplierRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Service
public class PurchaseService {

    public record PurchaseRequest(Long buyerId, Long supplierId, Long itemId, LocalDate purchaseDate,
                                  BigDecimal quantity, BigDecimal pricePerUnit,
                                  String paymentType, String notes) {}

    /** warning is filled when a credit purchase puts the supplier over their credit limit. */
    public record SaveResult(Purchase purchase, String warning) {}

    private static final Set<String> TYPES = Set.of("CASH", "CREDIT");

    private final PurchaseRepository repo;
    private final BuyerRepository buyers;
    private final SupplierRepository suppliers;
    private final ItemRepository items;
    private final SupplierBalanceService balances;

    public PurchaseService(PurchaseRepository repo, BuyerRepository buyers, SupplierRepository suppliers,
                           ItemRepository items, SupplierBalanceService balances) {
        this.repo = repo;
        this.buyers = buyers;
        this.suppliers = suppliers;
        this.items = items;
        this.balances = balances;
    }

    public List<Purchase> list(LocalDate date, Long buyerId, Long supplierId) {
        Specification<Purchase> spec = (r, q, cb) -> cb.conjunction();
        if (date != null) spec = spec.and((r, q, cb) -> cb.equal(r.get("purchaseDate"), date));
        if (buyerId != null) spec = spec.and((r, q, cb) -> cb.equal(r.get("buyerId"), buyerId));
        if (supplierId != null) spec = spec.and((r, q, cb) -> cb.equal(r.get("supplierId"), supplierId));
        return repo.findAll(spec, Sort.by(Sort.Direction.DESC, "purchaseDate", "id"));
    }

    public Purchase get(Long id) {
        return repo.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase not found"));
    }

    @Transactional
    public SaveResult create(PurchaseRequest req) {
        Purchase p = new Purchase();
        apply(p, req);
        repo.save(p);
        return new SaveResult(p, warningFor(p));
    }

    @Transactional
    public SaveResult update(Long id, PurchaseRequest req) {
        Purchase p = get(id);
        apply(p, req);
        repo.save(p);
        return new SaveResult(p, warningFor(p));
    }

    public void delete(Long id) {
        repo.delete(get(id));
    }

    private String warningFor(Purchase p) {
        if (!"CREDIT".equals(p.getPaymentType())) return null;
        Supplier s = suppliers.findById(p.getSupplierId()).orElseThrow();
        var b = balances.forSupplier(s);
        if (!b.overLimit()) return null;
        return String.format(
                "%s is over their credit limit: Rs %,.2f owed against a limit of Rs %,.2f. "
                        + "Pay at least Rs %,.2f to get back under the limit.",
                s.getName(), b.balance(), b.creditLimit(), b.minimumPayment());
    }

    private void apply(Purchase p, PurchaseRequest req) {
        if (req.buyerId() == null || !buyers.existsById(req.buyerId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid buyer");
        }
        if (req.supplierId() == null || !suppliers.existsById(req.supplierId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid supplier");
        }
        if (req.itemId() == null || !items.existsById(req.itemId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid item");
        }
        if (req.quantity() == null || req.quantity().signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be more than 0");
        }
        if (req.pricePerUnit() == null || req.pricePerUnit().signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Price must be 0 or more");
        }
        String type = req.paymentType() == null ? "" : req.paymentType().trim().toUpperCase();
        if (!TYPES.contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment type must be one of " + TYPES);
        }
        p.setBuyerId(req.buyerId());
        p.setSupplierId(req.supplierId());
        p.setItemId(req.itemId());
        p.setPurchaseDate(req.purchaseDate() == null ? LocalDate.now() : req.purchaseDate());
        p.setQuantity(req.quantity());
        p.setPricePerUnit(req.pricePerUnit());
        p.setTotal(req.quantity().multiply(req.pricePerUnit()).setScale(2, RoundingMode.HALF_UP));
        p.setPaymentType(type);
        p.setNotes(req.notes());
    }
}