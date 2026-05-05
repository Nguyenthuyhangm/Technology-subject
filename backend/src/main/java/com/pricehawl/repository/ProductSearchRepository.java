package com.pricehawl.repository;

import com.pricehawl.document.ProductDocument;
import org.springframework.data.elasticsearch.annotations.Query;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductSearchRepository
        extends ElasticsearchRepository<ProductDocument, String> {

    /**
     * Search đa field + hỗ trợ sai chính tả (fuzzy)
     */
    @Query("""
    {
      "multi_match": {
        "query": "?0",
        "fields": ["name^3", "categoryName", "brandName"],
        "fuzziness": "AUTO",
        "operator": "and"
      }
    }
    """)
    List<ProductDocument> search(String keyword);
}