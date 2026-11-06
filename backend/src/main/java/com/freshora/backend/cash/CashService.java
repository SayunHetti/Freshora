package com.freshora.backend.cash;

import com.freshora.backend.buyers.Buyer;
import com.freshora.backend.buyers.BuyerRepository;
import com.freshora.backend.purchases.PurchaseRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
public class CashService {

    public record LogRequest(Long buyerId, LocalDate logDate, BigDecimal amount,
                             String category, String notes) {}

    public record ReturnRequest(Long buyerId, LocalDate returnDate, BigDecimal amount, String notes) {}

    public record CheckRow(Long buyerId, String name, String type, BigDecimal dailyCashLimit,
                           BigDecimal cashGiven, BigDecimal cashSpent, BigDecimal creditPurchases,
                           BigDecimal cashReturned, BigDecimal difference, boolean flagged) {}

    // To add a category later, just add it here.
    private static final Set<String> CATEGORIES = Set.of("CHEQUE", "BANK_WITHDRAWAL", "CASH_GIVEN");

    private final BuyerCashLogRepository logs;
    private final BuyerCashReturnRepository returns;
    private final BuyerRepository buyers;
    private final PurchaseRepository purchases;

    public CashService(BuyerCashLogRepository logs, BuyerCashReturnRepository returns,
                       BuyerRepository buyers, PurchaseRepository purchases) {
        this.logs = logs;
        this.returns = returns;
        this.buyers = buyers;
        this.purchases = purchases;
    }

    // ---------- cash given ----------

    public List<BuyerCashLog> listLogs(LocalDate date, Long buyerId) {
        Specification<BuyerCashLog> spec = (r, q, cb) -> cb.conjunction();
        if (date != null) spec = spec.and((r, q, cb) -> cb.equal(r.get("logDate"), date));
        if (buyerId != null) spec = spec.and((r, q, cb) -> cb.equal(r.get("buyerId"), buyerId));
        return logs.findAll(spec, Sort.by(Sort.Direction.DESC, "logDate", "id"));
    }

    public BuyerCashLog getLog(Long id) {
        return logs.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Cash entry not found"));
    }

    @Transactional
    public BuyerCashLog createLog(LogRequest req) {
        BuyerCashLog c = new BuyerCashLog();
        applyLog(c, req, -1L);
        return logs.save(c);
    }

    @Transactional
    public BuyerCashLog updateLog(Long id, LogRequest req) {
        BuyerCashLog c = getLog(id);
        applyLog(c, req, id);
        return logs.save(c);
    }

    public void deleteLog(Long id) {
        logs.delete(getLog(id));
    }

    private void applyLog(BuyerCashLog c, LogRequest req, Long selfId) {
        Buyer buyer = findBuyer(req.buyerId());
        if (req.amount() == null || req.amount().signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be more than 0");
        }
        String category = req.category() == null ? "" : req.category().trim().toUpperCase();
        if (!CATEGORIES.contains(category)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category must be one of " + CATEGORIES);
        }
        LocalDate date = req.logDate() == null ? LocalDate.now() : req.logDate();

        BigDecimal limit = buyer.getDailyCashLimit();
        if (limit != null) {
            BigDecimal already = nz(logs.givenOnDate(buyer.getId(), date, selfId));
            BigDecimal after = already.add(req.amount());
            if (after.compareTo(limit) > 0) {
                BigDecimal remaining = limit.subtract(already).max(BigDecimal.ZERO);
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.format(
                        "Blocked: %s has a daily cash limit of Rs %,.2f. Rs %,.2f has already been given on %s, "
                                + "so adding Rs %,.2f would make it Rs %,.2f. You can still give up to Rs %,.2f.",
                        buyer.getName(), limit, already, date, req.amount(), after, remaining));
            }
        }
        c.setBuyerId(buyer.getId());
        c.setLogDate(date);
        c.setAmount(req.amount());
        c.setCategory(category);
        c.setNotes(req.notes());
    }

    // ---------- cash returned ----------

    public List<BuyerCashReturn> listReturns(LocalDate date, Long buyerId) {
        Specification<BuyerCashReturn> spec = (r, q, cb) -> cb.conjunction();
        if (date != null) spec = spec.and((r, q, cb) -> cb.equal(r.get("returnDate"), date));
        if (buyerId != null) spec = spec.and((r, q, cb) -> cb.equal(r.get("buyerId"), buyerId));
        return returns.findAll(spec, Sort.by(Sort.Direction.DESC, "returnDate", "id"));
    }

    public BuyerCashReturn getReturn(Long id) {
        return returns.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Return not found"));
    }

    public BuyerCashReturn createReturn(ReturnRequest req) {
        BuyerCashReturn r = new BuyerCashReturn();
        applyReturn(r, req);
        return returns.save(r);
    }

    public BuyerCashReturn updateReturn(Long id, ReturnRequest req) {
        BuyerCashReturn r = getReturn(id);
        applyReturn(r, req);
        return returns.save(r);
    }

    public void deleteReturn(Long id) {
        returns.delete(getReturn(id));
    }

    private void applyReturn(BuyerCashReturn r, ReturnRequest req) {
        Buyer buyer = findBuyer(req.buyerId());
        if (req.amount() == null || req.amount().signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be more than 0");
        }
        r.setBuyerId(buyer.getId());
        r.setReturnDate(req.returnDate() == null ? LocalDate.now() : req.returnDate());
        r.setAmount(req.amount());
        r.setNotes(req.notes());
    }

    // ---------- daily cash check ----------

    public List<CheckRow> dailyCheck(LocalDate date) {
        if (date == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date is required");
        }
        Map<Long, BigDecimal> given = new HashMap<>();
        logs.sumsByBuyer(date).forEach(r -> given.put(r.getBuyerId(), r.getTotal()));
        Map<Long, BigDecimal> returned = new HashMap<>();
        returns.sumsByBuyer(date).forEach(r -> returned.put(r.getBuyerId(), r.getTotal()));
        Map<Long, BigDecimal> spent = new HashMap<>();
        Map<Long, BigDecimal> credit = new HashMap<>();
        purchases.sumsByBuyer(date).forEach(r -> {
            if ("CASH".equals(r.getPaymentType())) spent.put(r.getBuyerId(), r.getTotal());
            else credit.put(r.getBuyerId(), r.getTotal());
        });

        List<CheckRow> rows = new ArrayList<>();
        for (Buyer b : buyers.findAll(Sort.by("name"))) {
            BigDecimal g = given.getOrDefault(b.getId(), BigDecimal.ZERO);
            BigDecimal s = spent.getOrDefault(b.getId(), BigDecimal.ZERO);
            BigDecimal cr = credit.getOrDefault(b.getId(), BigDecimal.ZERO);
            BigDecimal rt = returned.getOrDefault(b.getId(), BigDecimal.ZERO);
            boolean hasActivity = g.signum() != 0 || s.signum() != 0 || cr.signum() != 0 || rt.signum() != 0;
            if (!b.isActive() && !hasActivity) continue;
            BigDecimal diff = g.subtract(s).subtract(rt);
            rows.add(new CheckRow(b.getId(), b.getName(), b.getType(), b.getDailyCashLimit(),
                    g, s, cr, rt, diff, diff.signum() != 0));
        }
        return rows;
    }

    private Buyer findBuyer(Long id) {
        if (id == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid buyer");
        return buyers.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid buyer"));
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}