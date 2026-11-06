package com.freshora.backend.orders;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @GetMapping
    public List<CustomerOrder> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate deliveryDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long hotelId) {
        return service.list(deliveryDate, status, hotelId);
    }

    @GetMapping("/shopping-list")
    public List<OrderService.ShoppingLine> shoppingList(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.shoppingList(date);
    }

    @GetMapping("/{id}")
    public CustomerOrder get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerOrder create(@RequestBody OrderService.OrderRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public CustomerOrder update(@PathVariable Long id, @RequestBody OrderService.OrderRequest req) {
        return service.update(id, req);
    }

    @PatchMapping("/{id}/status")
    public CustomerOrder setStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return service.setStatus(id, body.get("status"));
    }

    @PostMapping("/{id}/copy")
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerOrder copy(@PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate deliveryDate) {
        return service.copy(id, deliveryDate);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}