package com.freshora.backend.hotels;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
public class HotelService {

    public record HotelRequest(String name, String contactPerson, String phone,
                               String address, BigDecimal creditLimit,
                               String paymentTerms, Boolean active, String notes) {}

    private final HotelRepository repo;

    public HotelService(HotelRepository repo) {
        this.repo = repo;
    }

    public List<Hotel> list(boolean includeInactive) {
        return includeInactive
                ? repo.findAll(Sort.by("name"))
                : repo.findByActiveTrueOrderByNameAsc();
    }

    public Hotel get(Long id) {
        return repo.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Hotel not found"));
    }

    public Hotel create(HotelRequest req) {
        String name = cleanName(req);
        if (repo.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A hotel with this name already exists");
        }
        Hotel hotel = new Hotel();
        apply(hotel, req, name);
        return repo.save(hotel);
    }

    public Hotel update(Long id, HotelRequest req) {
        Hotel hotel = get(id);
        String name = cleanName(req);
        if (repo.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A hotel with this name already exists");
        }
        apply(hotel, req, name);
        return repo.save(hotel);
    }

    /** "Delete" hides the hotel so old orders and invoices stay intact. */
    public void deactivate(Long id) {
        Hotel hotel = get(id);
        hotel.setActive(false);
        repo.save(hotel);
    }

    private String cleanName(HotelRequest req) {
        if (req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        }
        return req.name().trim();
    }

    private void apply(Hotel hotel, HotelRequest req, String name) {
        BigDecimal credit = req.creditLimit() == null ? BigDecimal.ZERO : req.creditLimit();
        if (credit.signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Credit limit cannot be negative");
        }
        hotel.setName(name);
        hotel.setContactPerson(req.contactPerson());
        hotel.setPhone(req.phone());
        hotel.setAddress(req.address());
        hotel.setCreditLimit(credit);
        hotel.setPaymentTerms(req.paymentTerms());
        if (req.active() != null) hotel.setActive(req.active());
        hotel.setNotes(req.notes());
    }
}