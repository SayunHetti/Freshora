package com.freshora.backend.prices;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HotelItemPriceRepository extends JpaRepository<HotelItemPrice, Long> {

    List<HotelItemPrice> findByHotelIdOrderByItemIdAscValidFromDesc(Long hotelId);

    List<HotelItemPrice> findAllByOrderByHotelIdAscItemIdAscValidFromDesc();

    /** True if another price for the same hotel and item overlaps this period. */
    @Query("""
        select count(p) > 0 from HotelItemPrice p
        where p.hotelId = :hotelId and p.itemId = :itemId and p.id <> :excludeId
          and p.validFrom <= :to
          and (p.validTo is null or p.validTo >= :from)
        """)
    boolean overlaps(@Param("hotelId") Long hotelId, @Param("itemId") Long itemId,
                     @Param("from") LocalDate from, @Param("to") LocalDate to,
                     @Param("excludeId") Long excludeId);

    /** The price that applies to a hotel and item on a given date (used by orders and invoices later). */
    @Query("""
        select p from HotelItemPrice p
        where p.hotelId = :hotelId and p.itemId = :itemId
          and p.validFrom <= :date and (p.validTo is null or p.validTo >= :date)
        """)
    Optional<HotelItemPrice> findApplicable(@Param("hotelId") Long hotelId,
                                            @Param("itemId") Long itemId,
                                            @Param("date") LocalDate date);
}