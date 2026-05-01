package org.example.backend;

import com.pricehawl.BackendApplication;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(classes = BackendApplication.class)
@ActiveProfiles("test")
class BackendApplicationTests {

    @Test
    void contextLoads() {
    }

}