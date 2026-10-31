package com.freshora.backend.items;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

@Service
public class ItemService {

    public record ItemRequest(String name, String category, String unit,
                              Boolean active, String notes) {}

    // To add a category later, just add it here. No database change needed.
    private static final Set<String> CATEGORIES = Set.of("FRUIT", "VEGETABLE");

    private final ItemRepository repo;

    public ItemService(ItemRepository repo) {
        this.repo = repo;
    }

    public List<Item> list(boolean includeInactive) {
        return includeInactive
                ? repo.findAll(org.springframework.data.domain.Sort.by("name"))
                : repo.findByActiveTrueOrderByNameAsc();
    }

    public Item get(Long id) {
        return repo.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found"));
    }

    public Item create(ItemRequest req) {
        String name = cleanName(req);
        if (repo.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An item with this name already exists");
        }
        Item item = new Item();
        apply(item, req, name);
        return repo.save(item);
    }

    public Item update(Long id, ItemRequest req) {
        Item item = get(id);
        String name = cleanName(req);
        if (repo.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An item with this name already exists");
        }
        apply(item, req, name);
        return repo.save(item);
    }

    /** "Delete" hides the item so old orders and invoices stay intact. */
    public void deactivate(Long id) {
        Item item = get(id);
        item.setActive(false);
        repo.save(item);
    }

    private String cleanName(ItemRequest req) {
        if (req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        }
        return req.name().trim();
    }

    private void apply(Item item, ItemRequest req, String name) {
        String category = req.category() == null ? "" : req.category().trim().toUpperCase();
        if (!CATEGORIES.contains(category)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Category must be one of " + CATEGORIES);
        }
        item.setName(name);
        item.setCategory(category);
        if (req.unit() != null && !req.unit().isBlank()) item.setUnit(req.unit().trim());
        if (req.active() != null) item.setActive(req.active());
        item.setNotes(req.notes());
    }
}