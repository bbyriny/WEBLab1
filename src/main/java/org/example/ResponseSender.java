package org.example;

import com.fastcgi.FCGIInterface;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.util.*;

public class ResponseSender {

    private final Checker checker = new Checker();
    private final JsonParser parser = new JsonParser();

    public void sendResponse() {
        try {
            long startTime = System.nanoTime();

            if (!"POST".equals(FCGIInterface.request.params.getProperty("REQUEST_METHOD"))) {
                sendError("Метод не поддерживается. Используйте POST.");
                return;
            }

            BigDecimal[] data = readRequestBody();
            BigDecimal x = data[0];
            BigDecimal y = data[1];
            BigDecimal r = data[2];

            checker.validate(x, y, r);

            boolean hit = checker.isHit(x, y, r);

            long endTime = System.nanoTime();
            double scriptTimeMs = (endTime - startTime) / 1_000_000.0;

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("x", x.toPlainString());
            response.put("y", y.toPlainString());
            response.put("r", r.toPlainString());
            response.put("hit", hit);
            response.put("currentTime", new Date().toString());
            response.put("scriptTimeMs", String.format("%.2f", scriptTimeMs));

            sendJson(response);

        } catch (IllegalArgumentException e) {
            sendError(e.getMessage());
        } catch (Exception e) {
            sendServerError("Внутренняя ошибка сервера: " + e.getMessage());
        }
    }

    private BigDecimal[] readRequestBody() throws IOException {
        FCGIInterface.request.inStream.fill();
        int length = FCGIInterface.request.inStream.available();
        ByteBuffer buffer = ByteBuffer.allocate(length);
        int readBytes = FCGIInterface.request.inStream.read(buffer.array(), 0, length);
        byte[] raw = new byte[readBytes];
        buffer.get(raw);
        String request = new String(raw, StandardCharsets.UTF_8);

        return parser.getBigDecimals(request);
    }

    private void sendJson(Map<String, Object> map) {
        String json = toJson(map);
        String httpResponse = """
            Status: 200 OK
            Content-Type: application/json
            Content-Length: %d

            %s
            """.formatted(json.getBytes(StandardCharsets.UTF_8).length, json);

        try {
            System.out.write(httpResponse.getBytes(StandardCharsets.UTF_8));
            System.out.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void sendError(String message) {
        String json = String.format("{\"error\":\"%s\"}", message);
        String httpResponse = """
            Status: 400 Bad Request
            Content-Type: application/json
            Content-Length: %d

            %s
            """.formatted(json.getBytes(StandardCharsets.UTF_8).length, json);

        try {
            System.out.write(httpResponse.getBytes(StandardCharsets.UTF_8));
            System.out.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void sendServerError(String message) {
        String json = String.format("{\"error\":\"%s\"}", message);
        String httpResponse = """
        Status: 500 Internal Server Error
        Content-Type: application/json
        Content-Length: %d

        %s
        """.formatted(json.getBytes(StandardCharsets.UTF_8).length, json);

        try {
            System.out.write(httpResponse.getBytes(StandardCharsets.UTF_8));
            System.out.flush();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private String toJson(Map<String, Object> map) {
        StringBuilder sb = new StringBuilder("{");
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            sb.append("\"").append(entry.getKey()).append("\":");
            Object val = entry.getValue();
            if (val instanceof String) {
                sb.append("\"").append(val).append("\"");
            } else {
                sb.append(val);
            }
            sb.append(",");
        }
        sb.deleteCharAt(sb.length() - 1);
        sb.append("}");
        return sb.toString();
    }
}
