package com.freshora.backend.purchases;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/purchases")
public class PurchaseController {

    private final PurchaseService service;

    public PurchaseController(PurchaseService service) {
        this.service = service;
    }

    @GetMapping
    public List<Purchase> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long buyerId,
            @RequestParam(required = false) Long supplierId) {
        return service.list(date, buyerId, supplierId);
    }

    @GetMapping("/{id}")
    public Purchase get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PurchaseService.SaveResult create(@RequestBody PurchaseService.PurchaseRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public PurchaseService.SaveResult update(@PathVariable Long id,
                                             @RequestBody PurchaseService.PurchaseRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}