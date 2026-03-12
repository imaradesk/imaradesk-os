"""
Survey Questions Bank
Hardcoded survey questions categorized by business type
"""

class SurveyQuestions:
    """Question bank for customer satisfaction surveys based on business type"""
    
    # Business types mapped to question sets
    BUSINESS_TYPES = [
        'Software', 'Insurance', 'Healthcare', 'Finance', 'E-commerce',
        'Education', 'Manufacturing', 'Retail', 'Consulting', 'Other'
    ]
    
    # Common questions for all business types
    COMMON_QUESTIONS = [
        {
            'id': 'common_1',
            'question': 'How satisfied are you with our overall service?',
            'type': 'rating',
            'scale': 5,
        },
        {
            'id': 'common_2',
            'question': 'How likely are you to recommend our services to others?',
            'type': 'nps',
            'scale': 10,
        },
    ]
    
    # Business-specific questions
    QUESTIONS_BY_TYPE = {
        'Software': [
            {'id': 'sw_1', 'question': 'How would you rate the ease of use of our software?', 'type': 'rating', 'scale': 5},
            {'id': 'sw_2', 'question': 'How satisfied are you with the software performance and speed?', 'type': 'rating', 'scale': 5},
            {'id': 'sw_3', 'question': 'Are the features meeting your business needs?', 'type': 'rating', 'scale': 5},
            {'id': 'sw_4', 'question': 'How responsive is our technical support team?', 'type': 'rating', 'scale': 5},
            {'id': 'sw_5', 'question': 'How clear and helpful is our documentation?', 'type': 'rating', 'scale': 5},
            {'id': 'sw_6', 'question': 'How satisfied are you with software updates and new features?', 'type': 'rating', 'scale': 5},
            {'id': 'sw_7', 'question': 'How would you rate the integration capabilities with other tools?', 'type': 'rating', 'scale': 5},
            {'id': 'sw_8', 'question': 'What features would you like to see added?', 'type': 'text'},
        ],
        
        'Insurance': [
            {'id': 'ins_1', 'question': 'How satisfied are you with the claims processing time?', 'type': 'rating', 'scale': 5},
            {'id': 'ins_2', 'question': 'How clear and understandable are your policy terms?', 'type': 'rating', 'scale': 5},
            {'id': 'ins_3', 'question': 'How responsive is our customer service team?', 'type': 'rating', 'scale': 5},
            {'id': 'ins_4', 'question': 'How satisfied are you with your premium rates?', 'type': 'rating', 'scale': 5},
            {'id': 'ins_5', 'question': 'How easy is it to manage your policy online?', 'type': 'rating', 'scale': 5},
            {'id': 'ins_6', 'question': 'How well does your agent understand your needs?', 'type': 'rating', 'scale': 5},
            {'id': 'ins_7', 'question': 'How satisfied are you with the claim settlement amount?', 'type': 'rating', 'scale': 5},
            {'id': 'ins_8', 'question': 'What can we improve in our insurance services?', 'type': 'text'},
        ],
        
        'Healthcare': [
            {'id': 'hc_1', 'question': 'How satisfied are you with the quality of care received?', 'type': 'rating', 'scale': 5},
            {'id': 'hc_2', 'question': 'How easy was it to schedule an appointment?', 'type': 'rating', 'scale': 5},
            {'id': 'hc_3', 'question': 'How clean and comfortable was our facility?', 'type': 'rating', 'scale': 5},
            {'id': 'hc_4', 'question': 'How professional and caring was our staff?', 'type': 'rating', 'scale': 5},
            {'id': 'hc_5', 'question': 'How satisfied are you with the wait time?', 'type': 'rating', 'scale': 5},
            {'id': 'hc_6', 'question': 'How clear were the treatment explanations?', 'type': 'rating', 'scale': 5},
            {'id': 'hc_7', 'question': 'How satisfied are you with billing and insurance handling?', 'type': 'rating', 'scale': 5},
            {'id': 'hc_8', 'question': 'What aspects of our healthcare service can we improve?', 'type': 'text'},
        ],
        
        'Finance': [
            {'id': 'fin_1', 'question': 'How satisfied are you with our financial products?', 'type': 'rating', 'scale': 5},
            {'id': 'fin_2', 'question': 'How clear and transparent are our fees and charges?', 'type': 'rating', 'scale': 5},
            {'id': 'fin_3', 'question': 'How easy is it to access your account information?', 'type': 'rating', 'scale': 5},
            {'id': 'fin_4', 'question': 'How knowledgeable is our financial advisory team?', 'type': 'rating', 'scale': 5},
            {'id': 'fin_5', 'question': 'How secure do you feel your information is with us?', 'type': 'rating', 'scale': 5},
            {'id': 'fin_6', 'question': 'How satisfied are you with our mobile/online banking?', 'type': 'rating', 'scale': 5},
            {'id': 'fin_7', 'question': 'How quickly are your transactions processed?', 'type': 'rating', 'scale': 5},
            {'id': 'fin_8', 'question': 'What financial services would you like us to offer?', 'type': 'text'},
        ],
        
        'E-commerce': [
            {'id': 'ec_1', 'question': 'How easy was it to find the products you were looking for?', 'type': 'rating', 'scale': 5},
            {'id': 'ec_2', 'question': 'How satisfied are you with the product quality?', 'type': 'rating', 'scale': 5},
            {'id': 'ec_3', 'question': 'How would you rate the delivery speed?', 'type': 'rating', 'scale': 5},
            {'id': 'ec_4', 'question': 'How satisfied are you with product pricing?', 'type': 'rating', 'scale': 5},
            {'id': 'ec_5', 'question': 'How easy was the checkout process?', 'type': 'rating', 'scale': 5},
            {'id': 'ec_6', 'question': 'How satisfied are you with customer support?', 'type': 'rating', 'scale': 5},
            {'id': 'ec_7', 'question': 'How likely are you to shop with us again?', 'type': 'rating', 'scale': 5},
            {'id': 'ec_8', 'question': 'What products or features would you like to see?', 'type': 'text'},
        ],
        
        'Education': [
            {'id': 'edu_1', 'question': 'How satisfied are you with the quality of instruction?', 'type': 'rating', 'scale': 5},
            {'id': 'edu_2', 'question': 'How relevant is the course content to your goals?', 'type': 'rating', 'scale': 5},
            {'id': 'edu_3', 'question': 'How accessible and helpful are the instructors?', 'type': 'rating', 'scale': 5},
            {'id': 'edu_4', 'question': 'How satisfied are you with learning materials and resources?', 'type': 'rating', 'scale': 5},
            {'id': 'edu_5', 'question': 'How well-organized is the curriculum?', 'type': 'rating', 'scale': 5},
            {'id': 'edu_6', 'question': 'How satisfied are you with the learning platform/facilities?', 'type': 'rating', 'scale': 5},
            {'id': 'edu_7', 'question': 'How valuable is the certification/degree to you?', 'type': 'rating', 'scale': 5},
            {'id': 'edu_8', 'question': 'What courses or topics would you like us to offer?', 'type': 'text'},
        ],
        
        'Manufacturing': [
            {'id': 'mfg_1', 'question': 'How satisfied are you with product quality?', 'type': 'rating', 'scale': 5},
            {'id': 'mfg_2', 'question': 'How timely are our deliveries?', 'type': 'rating', 'scale': 5},
            {'id': 'mfg_3', 'question': 'How competitive are our prices?', 'type': 'rating', 'scale': 5},
            {'id': 'mfg_4', 'question': 'How responsive is our customer service?', 'type': 'rating', 'scale': 5},
            {'id': 'mfg_5', 'question': 'How satisfied are you with our customization capabilities?', 'type': 'rating', 'scale': 5},
            {'id': 'mfg_6', 'question': 'How well do we handle quality issues or defects?', 'type': 'rating', 'scale': 5},
            {'id': 'mfg_7', 'question': 'How satisfied are you with our supply chain reliability?', 'type': 'rating', 'scale': 5},
            {'id': 'mfg_8', 'question': 'What improvements would you suggest for our products?', 'type': 'text'},
        ],
        
        'Retail': [
            {'id': 'ret_1', 'question': 'How satisfied are you with our product selection?', 'type': 'rating', 'scale': 5},
            {'id': 'ret_2', 'question': 'How would you rate the store cleanliness and organization?', 'type': 'rating', 'scale': 5},
            {'id': 'ret_3', 'question': 'How friendly and helpful was our staff?', 'type': 'rating', 'scale': 5},
            {'id': 'ret_4', 'question': 'How satisfied are you with our pricing?', 'type': 'rating', 'scale': 5},
            {'id': 'ret_5', 'question': 'How easy was it to find what you needed?', 'type': 'rating', 'scale': 5},
            {'id': 'ret_6', 'question': 'How satisfied are you with checkout speed?', 'type': 'rating', 'scale': 5},
            {'id': 'ret_7', 'question': 'How satisfied are you with our return/exchange policy?', 'type': 'rating', 'scale': 5},
            {'id': 'ret_8', 'question': 'What products would you like us to stock?', 'type': 'text'},
        ],
        
        'Consulting': [
            {'id': 'con_1', 'question': 'How satisfied are you with the expertise of our consultants?', 'type': 'rating', 'scale': 5},
            {'id': 'con_2', 'question': 'How well did we understand your business needs?', 'type': 'rating', 'scale': 5},
            {'id': 'con_3', 'question': 'How actionable and practical were our recommendations?', 'type': 'rating', 'scale': 5},
            {'id': 'con_4', 'question': 'How satisfied are you with the value for money?', 'type': 'rating', 'scale': 5},
            {'id': 'con_5', 'question': 'How timely was project delivery?', 'type': 'rating', 'scale': 5},
            {'id': 'con_6', 'question': 'How responsive were we to your questions and concerns?', 'type': 'rating', 'scale': 5},
            {'id': 'con_7', 'question': 'How likely are you to use our services again?', 'type': 'rating', 'scale': 5},
            {'id': 'con_8', 'question': 'What additional consulting services would you be interested in?', 'type': 'text'},
        ],
        
        'Other': [
            {'id': 'oth_1', 'question': 'How satisfied are you with the quality of our service?', 'type': 'rating', 'scale': 5},
            {'id': 'oth_2', 'question': 'How well did we meet your expectations?', 'type': 'rating', 'scale': 5},
            {'id': 'oth_3', 'question': 'How professional was our team?', 'type': 'rating', 'scale': 5},
            {'id': 'oth_4', 'question': 'How satisfied are you with our pricing?', 'type': 'rating', 'scale': 5},
            {'id': 'oth_5', 'question': 'How timely was our service delivery?', 'type': 'rating', 'scale': 5},
            {'id': 'oth_6', 'question': 'How responsive were we to your needs?', 'type': 'rating', 'scale': 5},
            {'id': 'oth_7', 'question': 'How satisfied are you with the results?', 'type': 'rating', 'scale': 5},
            {'id': 'oth_8', 'question': 'What can we do to improve our service?', 'type': 'text'},
        ],
    }
    
    @classmethod
    def get_questions_for_business_type(cls, business_type):
        """
        Get 10 survey questions for a specific business type
        Returns: List of 10 questions (2 common + 8 business-specific)
        """
        if business_type not in cls.BUSINESS_TYPES:
            business_type = 'Other'
        
        # Combine common questions with business-specific questions
        questions = cls.COMMON_QUESTIONS.copy()
        business_questions = cls.QUESTIONS_BY_TYPE.get(business_type, cls.QUESTIONS_BY_TYPE['Other'])
        questions.extend(business_questions)
        
        return questions[:10]  # Ensure exactly 10 questions
    
    @classmethod
    def get_all_business_types(cls):
        """Get list of all available business types"""
        return cls.BUSINESS_TYPES
