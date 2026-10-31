package com.freshora.backend.buyers;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Service
public class BuyerService {

    public record BuyerRequest(String name, String type, BigDecimal dailyCashLimit,
                               Boolean active, String notes) {}

    // To add a buyer type later, just add it here.
    private static final Set<String> TYPES = Set.of("VEGETABLE", "FRUIT");

    private final BuyerRepository repo;

    public BuyerService(BuyerRepository repo) {
        this.repo = repo;
    }

    public List<Buyer> list(boolean includeInactive) {
        return includeInactive
                ? repo.findAll(Sort.by("name"))
                : repo.findByActiveTrueOrderByNameAsc();
    }

    public Buyer get(Long id) {
        return repo.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Buyer not found"));
    }

    public Buyer create(BuyerRequest req) {
        Buyer b = new Buyer();
        apply(b, req);
        return repo.save(b);
    }

    public Buyer update(Long id, BuyerRequest req) {
        Buyer b = get(id);
        apply(b, req);
        return repo.save(b);
    }

    public void deactivate(Long id) {
        Buyer b = get(id);
        b.setActive(false);
        repo.save(b);
    }

    private void apply(Buyer b, BuyerRequest req) {
        if (req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        }
        String type = req.type() == null ? "" : req.type().trim().toUpperCase();
        if (!TYPES.contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type must be one of " + TYPES);
        }
        if (req.dailyCashLimit() != null && req.dailyCashLimit().signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Daily cash limit cannot be negative");
        }
        b.setName(req.name().trim());
        b.setType(type);
        b.setDailyCashLimit(req.dailyCashLimit());
        if (req.active() != null) b.setActive(req.active());
        b.setNotes(req.notes());
    }
}