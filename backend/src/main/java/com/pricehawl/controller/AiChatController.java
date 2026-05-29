package com.pricehawl.controller;

import com.pricehawl.dto.AiChatRequest;
import com.pricehawl.service.AiChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/ai-chat")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AiChatController {

    private final AiChatService aiChatService;

    private final ExecutorService executor = Executors.newCachedThreadPool();

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChat(@RequestBody AiChatRequest request) {
        SseEmitter emitter = new SseEmitter(60_000L);

        executor.execute(() -> {
            try {
                String answer = aiChatService.answer(request);

                String[] chunks = answer.split("(?<=\\s)");

                for (String chunk : chunks) {
                    emitter.send(SseEmitter.event()
                            .name("chunk")
                            .data(chunk));

                    Thread.sleep(25);
                }

                emitter.send(SseEmitter.event()
                        .name("done")
                        .data("[DONE]"));

                emitter.complete();

            } catch (Exception e) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("error")
                            .data("Xin lỗi, AI đang gặp lỗi. Bạn thử lại sau nhé."));
                } catch (Exception ignored) {
                }

                emitter.completeWithError(e);
            }
        });

        return emitter;
    }
}