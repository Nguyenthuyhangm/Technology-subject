package com.pricehawl.dto;

import com.pricehawl.entity.enums.PaymentMethod;
import com.pricehawl.entity.enums.PremiumPlan;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaymentOrderDTO{
    private PremiumPlan plan;
    private PaymentMethod method;
}