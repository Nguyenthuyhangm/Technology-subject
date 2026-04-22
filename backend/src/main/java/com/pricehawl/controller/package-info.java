@org.springframework.modulith.ApplicationModule(
    allowedDependencies = {
        "service::api",
        "service::model"
    }
)
package com.pricehawl.controller;