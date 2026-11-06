package com.freshora.backend.prices;

import com.freshora.backend.hotels.HotelRepository;
import com.freshora.backend.items.ItemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class HotelItemPriceService {

    public record PriceRequest(Long hotelId, Long itemId, BigDecimal price,
                               LocalDate validFrom, LocalDate validTo, String notes) {}

    private static final LocalDate FOREVER = LocalDate.of(9999, 12, 31);

    private final HotelItemPriceRepository repo;
    private final HotelRepository hotels;
    private final ItemRepository items;

    public HotelItemPriceService(HotelItemPriceRepository repo, HotelRepository hotels,
                                 ItemRepository items) {
        this.repo = repo;
        this.hotels = hotels;
        this.items = items;
    }

    public List<HotelItemPrice> list(Long hotelId) {
        return hotelId == null
                ? repo.findAllByOrderByHotelIdAscItemIdAscValidFromDesc()
                : repo.findByHotelIdOrderByItemIdAscValidFromDesc(hotelId);
    }

    public HotelItemPrice get(Long id) {
        return repo.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Price not found"));
    }

    public HotelItemPrice create(PriceRequest req) {
        HotelItemPrice p = new HotelItemPrice();
        apply(p, req, -1L);
        return repo.save(p);
    }

    public HotelItemPrice update(Long id, PriceRequest req) {
        HotelItemPrice p = get(id);
        apply(p, req, id);
        return repo.save(p);
    }

    public void delete(Long id) {
        repo.delete(get(id));
    }

    private void apply(HotelItemPrice p, PriceRequest req, Long selfId) {
        if (req.hotelId() == null || !hotels.existsById(req.hotelId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid hotel");
        }
        if (req.itemId() == null || !items.existsById(req.itemId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid item");
        }
        if (req.price() == null || req.price().signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Price must be 0 or more");
        }
        if (req.validFrom() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valid from date is required");
        }
        if (req.validTo() != null && req.validTo().isBefore(req.validFrom())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Valid to cannot be before valid from");
        }
        LocalDate to = req.validTo() == null ? FOREVER : req.validTo();
        if (repo.overlaps(req.hotelId(), req.itemId(), req.validFrom(), to, selfId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This hotel already has a price for this item in an overlapping period");
        }
        p.setHotelId(req.hotelId());
        p.setItemId(req.itemId());
        p.setPrice(req.price());
        p.setValidFrom(req.validFrom());
        p.setValidTo(req.validTo());
        p.setNotes(req.notes());
    }
}