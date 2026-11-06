package com.freshora.backend.cash;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
public class CashController {

    private final CashService service;

    public CashController(CashService service) {
        this.service = service;
    }

    // cash given to buyers
    @GetMapping("/cash-log")
    public List<BuyerCashLog> listLogs(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long buyerId) {
        return service.listLogs(date, buyerId);
    }

    @PostMapping("/cash-log")
    @ResponseStatus(HttpStatus.CREATED)
    public BuyerCashLog createLog(@RequestBody CashService.LogRequest req) {
        return service.createLog(req);
    }

    @PutMapping("/cash-log/{id}")
    public BuyerCashLog updateLog(@PathVariable Long id, @RequestBody CashService.LogRequest req) {
        return service.updateLog(id, req);
    }

    @DeleteMapping("/cash-log/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLog(@PathVariable Long id) {
        service.deleteLog(id);
    }

    // cash returned by buyers
    @GetMapping("/cash-returns")
    public List<BuyerCashReturn> listReturns(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long buyerId) {
        return service.listReturns(date, buyerId);
    }

    @PostMapping("/cash-returns")
    @ResponseStatus(HttpStatus.CREATED)
    public BuyerCashReturn createReturn(@RequestBody CashService.ReturnRequest req) {
        return service.createReturn(req);
    }

    @PutMapping("/cash-returns/{id}")
    public BuyerCashReturn updateReturn(@PathVariable Long id, @RequestBody CashService.ReturnRequest req) {
        return service.updateReturn(id, req);
    }

    @DeleteMapping("/cash-returns/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReturn(@PathVariable Long id) {
        service.deleteReturn(id);
    }

    // the daily check
    @GetMapping("/daily-cash-check")
    public List<CashService.CheckRow> dailyCheck(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.dailyCheck(date);
    }
}