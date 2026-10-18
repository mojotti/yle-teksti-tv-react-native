#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppNative, NSObject)

RCT_EXTERN_METHOD(setPortraitLock:(BOOL)locked)
RCT_EXTERN_METHOD(setWidgetData:(NSDictionary *)data)

@end
