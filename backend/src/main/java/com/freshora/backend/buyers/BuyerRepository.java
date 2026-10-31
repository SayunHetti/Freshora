package com.freshora.backend.buyers;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BuyerRepository extends JpaRepository<Buyer, Long> {
    List<Buyer> findByActiveTrueOrderByNameAsc();
}