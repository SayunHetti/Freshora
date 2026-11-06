package com.freshora.backend.orders;

import com.freshora.backend.hotels.HotelRepository;
import com.freshora.backend.items.Item;
import com.freshora.backend.items.ItemRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class OrderService {

    public record LineRequest(Long itemId, BigDecimal quantity,
                              BigDecimal deliveredQuantity, String notes) {}

    public record OrderRequest(Long hotelId, LocalDate orderDate, LocalDate deliveryDate,
                               String status, String notes, List<LineRequest> items) {}

    public record ShoppingLine(Long itemId, String name, String category,
                               String unit, BigDecimal total) {}

    // To add a status later, just add it here. No database change needed.
    private static final Set<String> STATUSES =
            Set.of("RECEIVED", "PURCHASED", "PACKED", "DELIVERED", "CANCELLED");

    private final CustomerOrderRepository repo;
    private final HotelRepository hotels;
    private final ItemRepository items;

    public OrderService(CustomerOrderRepository repo, HotelRepository hotels, ItemRepository items) {
        this.repo = repo;
        this.hotels = hotels;
        this.items = items;
    }

    public List<CustomerOrder> list(LocalDate deliveryDate, String status, Long hotelId) {
        Specification<CustomerOrder> spec = (r, q, cb) -> cb.conjunction();
        if (deliveryDate != null) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("deliveryDate"), deliveryDate));
        }
        if (status != null && !status.isBlank()) {
            String s = status.trim().toUpperCase();
            spec = spec.and((r, q, cb) -> cb.equal(r.get("status"), s));
        }
        if (hotelId != null) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("hotelId"), hotelId));
        }
        return repo.findAll(spec, Sort.by(Sort.Direction.DESC, "deliveryDate", "id"));
    }

    public CustomerOrder get(Long id) {
        return repo.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    @Transactional
    public CustomerOrder create(OrderRequest req) {
        CustomerOrder o = new CustomerOrder();
        apply(o, req);
        return repo.save(o);
    }

    @Transactional
    public CustomerOrder update(Long id, OrderRequest req) {
        CustomerOrder o = get(id);
        apply(o, req);
        return repo.save(o);
    }

    @Transactional
    public CustomerOrder setStatus(Long id, String status) {
        CustomerOrder o = get(id);
        o.setStatus(cleanStatus(status));
        return repo.save(o);
    }

    @Transactional
    public CustomerOrder copy(Long id, LocalDate newDeliveryDate) {
        if (newDeliveryDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Delivery date is required");
        }
        CustomerOrder src = get(id);
        CustomerOrder copy = new CustomerOrder();
        copy.setHotelId(src.getHotelId());
        copy.setOrderDate(LocalDate.now());
        copy.setDeliveryDate(newDeliveryDate);
        copy.setStatus("RECEIVED");
        copy.setNotes(src.getNotes());
        for (OrderItem li : src.getItems()) {
            OrderItem n = new OrderItem();
            n.setItemId(li.getItemId());
            n.setQuantity(li.getQuantity());
            n.setNotes(li.getNotes());
            copy.getItems().add(n);
        }
        return repo.save(copy);
    }

    @Transactional
    public void delete(Long id) {
        repo.delete(get(id));
    }

    public List<ShoppingLine> shoppingList(LocalDate date) {
        if (date == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date is required");
        }
        var rows = repo.shoppingList(date);
        Map<Long, Item> byId = items.findAllById(
                        rows.stream().map(CustomerOrderRepository.ShoppingRow::getItemId).toList())
                .stream().collect(Collectors.toMap(Item::getId, Function.identity()));
        return rows.stream()
                .map(r -> {
                    Item it = byId.get(r.getItemId());
                    return new ShoppingLine(r.getItemId(),
                            it == null ? "#" + r.getItemId() : it.getName(),
                            it == null ? "" : it.getCategory(),
                            it == null ? "" : it.getUnit(),
                            r.getTotal());
                })
                .sorted(Comparator.comparing(ShoppingLine::category)
                        .thenComparing(ShoppingLine::name))
                .toList();
    }

    private String cleanStatus(String status) {
        String s = status == null ? "" : status.trim().toUpperCase();
        if (!STATUSES.contains(s)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be one of " + STATUSES);
        }
        return s;
    }

    private void apply(CustomerOrder o, OrderRequest req) {
        if (req.hotelId() == null || !hotels.existsById(req.hotelId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid hotel");
        }
        if (req.deliveryDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Delivery date is required");
        }
        if (req.items() == null || req.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add at least one item");
        }
        o.setHotelId(req.hotelId());
        o.setOrderDate(req.orderDate() == null
                ? (o.getOrderDate() == null ? LocalDate.now() : o.getOrderDate())
                : req.orderDate());
        o.setDeliveryDate(req.deliveryDate());
        o.setStatus(req.status() == null || req.status().isBlank() ? o.getStatus() : cleanStatus(req.status()));
        o.setNotes(req.notes());
        syncLines(o, req.items());
    }

    /** Updates lines in place (matched by item) so the unique (order, item) rule never clashes. */
    private void syncLines(CustomerOrder o, List<LineRequest> lines) {
        Map<Long, OrderItem> existing = o.getItems().stream()
                .collect(Collectors.toMap(OrderItem::getItemId, Function.identity()));
        Set<Long> seen = new HashSet<>();

        for (LineRequest l : lines) {
            if (l.itemId() == null || !items.existsById(l.itemId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid item on every line");
            }
            if (!seen.add(l.itemId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The same item is listed twice");
            }
            if (l.quantity() == null || l.quantity().signum() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be more than 0");
            }
            if (l.deliveredQuantity() != null && l.deliveredQuantity().signum() < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Delivered quantity cannot be negative");
            }
            OrderItem li = existing.get(l.itemId());
            if (li == null) {
                li = new OrderItem();
                li.setItemId(l.itemId());
                o.getItems().add(li);
            }
            li.setQuantity(l.quantity());
            li.setDeliveredQuantity(l.deliveredQuantity());
            li.setNotes(l.notes());
        }
        o.getItems().removeIf(li -> !seen.contains(li.getItemId()));
    }
}