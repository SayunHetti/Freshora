package com.freshora.backend.buyers;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/buyers")
public class BuyerController {

    private final BuyerService service;

    public BuyerController(BuyerService service) {
        this.service = service;
    }

    @GetMapping
    public List<Buyer> list(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return service.list(includeInactive);
    }

    @GetMapping("/{id}")
    public Buyer get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Buyer create(@RequestBody BuyerService.BuyerRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public Buyer update(@PathVariable Long id, @RequestBody BuyerService.BuyerRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.deactivate(id);
    }
}