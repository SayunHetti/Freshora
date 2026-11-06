package com.freshora.backend.supplierpayments;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SupplierPaymentController {

    private final SupplierPaymentService service;
    private final SupplierBalanceService balances;

    public SupplierPaymentController(SupplierPaymentService service, SupplierBalanceService balances) {
        this.service = service;
        this.balances = balances;
    }

    @GetMapping("/supplier-balances")
    public List<SupplierBalanceService.Balance> balances() {
        return balances.all();
    }

    @GetMapping("/supplier-payments")
    public List<SupplierPayment> list(@RequestParam(required = false) Long supplierId) {
        return service.list(supplierId);
    }

    @GetMapping("/supplier-payments/{id}")
    public SupplierPayment get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping("/supplier-payments")
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierPayment create(@RequestBody SupplierPaymentService.PaymentRequest req) {
        return service.create(req);
    }

    @PutMapping("/supplier-payments/{id}")
    public SupplierPayment update(@PathVariable Long id,
                                  @RequestBody SupplierPaymentService.PaymentRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/supplier-payments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}