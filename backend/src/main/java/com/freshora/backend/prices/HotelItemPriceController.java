package com.freshora.backend.prices;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/prices")
public class HotelItemPriceController {

    private final HotelItemPriceService service;

    public HotelItemPriceController(HotelItemPriceService service) {
        this.service = service;
    }

    @GetMapping
    public List<HotelItemPrice> list(@RequestParam(required = false) Long hotelId) {
        return service.list(hotelId);
    }

    @GetMapping("/{id}")
    public HotelItemPrice get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HotelItemPrice create(@RequestBody HotelItemPriceService.PriceRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public HotelItemPrice update(@PathVariable Long id,
                                 @RequestBody HotelItemPriceService.PriceRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}