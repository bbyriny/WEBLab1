package org.example;

import com.fastcgi.FCGIInterface;

public class Main {
    public static void main(String[] args) {
        FCGIInterface fcgiInterface = new FCGIInterface();
        ResponseSender sender = new ResponseSender();

        while (fcgiInterface.FCGIaccept() >= 0) {
            sender.sendResponse();
        }
    }
}
