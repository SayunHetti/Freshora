package com.freshora.backend.suppliers;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SupplierService {

    public record SupplierRequest(String name, String phone, String address,
                                  BigDecimal creditLimit, Boolean active, String notes) {}

    private final SupplierRepository repo;

    public SupplierService(SupplierRepository repo) {
        this.repo = repo;
    }

    public List<Supplier> list(boolean includeInactive) {
        return includeInactive
                ? repo.findAll(Sort.by("name"))
                : repo.findByActiveTrueOrderByNameAsc();
    }

    public Supplier get(Long id) {
        return repo.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));
    }

    public Supplier create(SupplierRequest req) {
        String name = cleanName(req);
        if (repo.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A supplier with this name already exists");
        }
        Supplier s = new Supplier();
        apply(s, req, name);
        return repo.save(s);
    }

    public Supplier update(Long id, SupplierRequest req) {
        Supplier s = get(id);
        String name = cleanName(req);
        if (repo.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A supplier with this name already exists");
        }
        apply(s, req, name);
        return repo.save(s);
    }

    public void deactivate(Long id) {
        Supplier s = get(id);
        s.setActive(false);
        repo.save(s);
    }

    private String cleanName(SupplierRequest req) {
        if (req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        }
        return req.name().trim();
    }

    private void apply(Supplier s, SupplierRequest req, String name) {
        BigDecimal credit = req.creditLimit() == null ? BigDecimal.ZERO : req.creditLimit();
        if (credit.signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Credit limit cannot be negative");
        }
        s.setName(name);
        s.setPhone(req.phone());
        s.setAddress(req.address());
        s.setCreditLimit(credit);
        if (req.active() != null) s.setActive(req.active());
        s.setNotes(req.notes());
    }
}