
import com.google.gwt.user.client.rpc.AsyncCallback;
import com.google.inject.Inject;
import com.google.web.bindery.event.shared.EventBus;
import com.gwtplatform.mvp.client.proxy.Proxy;


public abstract class MediaTypeRenderPresenter 
    <V extends TabbedView, P extends Proxy<?> & HasType<M>, M extends MediaType>
    extends ScenariosPresenter<V, P, M> {
  @Inject
  private TabState            tabState;

  @Inject
  private MediaTypeController mediaTypeController;

  public MediaTypeRenderPresenter(EventBus eventBus, V view, P proxy, PresenterData presenterData) {
    super(eventBus, view, proxy, presenterData);
  }

  @Override
  public void onOpenEntity(MediaType mediaType, AsyncCallback<MediaType> asyncCallback) {

    super.onOpenEntity(mediaType, asyncCallback);

    // wait for onOpenEntity()
    if (getView().isEmpty()) {
      return;
    }

    try {
      // open mediaType from context
      if (isContextOpeningAllowed()) {
        openInContext(systemState.getMediaTypeState().getRelatedMediaType());
      }
      // open details tab
      else {
        getView().selectTab(DetailsTab.class, false);
      }
    }
    catch (Exception e) {
      Log.get(this).log("Cann't open VIEW in context of related mediaType: ", e);
    }
  }

  private boolean isContextOpeningAllowed() {
    return !systemState.getConditionState().equals(ConditionState.CREATE);
  }

  /**
   * Open View/Preview in context of related mediaType
   * 
   * @param src
   *          origin mediaType
   */
  protected final void openInContext(MediaType src) {

    assert systemState != null;

    if (src != null) {
      final String self = UriUtils.searchUrl(src.getLink(), UriConstants.SELF);
      if (src instanceof ApprovalCycle) {
        MediaType bean = systemState.getCurrentMediaType();
        if (bean instanceof IHasHrefApproval) {
          ((IHasHrefApproval) bean).setHrefApproval(self);
        }
        systemState.setConditionState(ConditionState.VISA);
        LifecycleTab tab = getView().getParticularTab(LifecycleTab.class);
        // throwIfNull(tab, "openInContext error: cann't find LifecycleTab.");
        if (tab != null) {
          getView().selectTab(LifecycleTab.class, false);
          tab.setDataTabAndOpenApprove(bean);
        }
        else {
          mediaTypeController.reloadMediaType();
        }
      }
      else if (src instanceof Review) {
        MediaType bean = systemState.getCurrentMediaType();
        if (bean instanceof IHasHrefApproval) {
          ((IHasHrefApproval) bean).setHrefApproval(self);
        }
        // getView().selectTab(LifecycleTab.class, false);
        LifecycleTab tab = getView().getParticularTab(LifecycleTab.class);
        // throwIfNull(tab, "openInContext error: cann't find LifecycleTab.");
        if (tab != null) {
          getView().selectTab(LifecycleTab.class, false);
          tab.setDataTabAndOpenApprove(bean);
        }
        tab.setDataTabAndOpenReview(bean, true);
      }
      else if (src instanceof Report) {
        onOpenReport((ILifeCycleDocumentItem) systemState.getCurrentMediaType(), self);
      }
      else if (src instanceof Resolution) {
        onOpenResolution((ILifeCycleDocumentItem) systemState.getCurrentMediaType(), self);
      }
      else if (src instanceof Order) {
        getView().selectTab(ExecutionTab.class, false);
      }
      else if (src instanceof Message) {
        getView().selectTab(DiscussionTab.class, false);
        DiscussionTab tab = getView().getParticularTab(DiscussionTab.class);
        MediaType bean = systemState.getCurrentMediaType();
        tab.render(bean, null);
      }
    }
    else {
      MediaType current = systemState.getMediaTypeState().getCurrentMediaType();
      if (!systemState.getWorkspaceState().isView()
          && !systemState.getConditionState().equals(ConditionState.UPDATE)) {
        Class<? extends AbstractTab> tab = getDefaultSelectedTab(current.getClass());
        tabState.setCurrentTab(tab);
        getView().selectTab(tab, false);
      }
      else {
        Class<? extends AbstractTab> tab = tabState.getSelectionMap().get(current.getClass());
        Class<? extends AbstractTab> currentTab = tabState.getCurrentTab();
        currentTab = tab != null ? tab : getDefaultSelectedTab(current.getClass());
        getView().selectTab(currentTab, false);
      }
    }
  }

  private static void throwIfNull(LifecycleTab tab, String s) {
    if (null == tab) {
      throw new IllegalArgumentException(s);
    }
  }

  protected Class<? extends AbstractTab> getDefaultSelectedTab(Class<? extends IBean> clazz) {
    MediaTypeConfig config = MediaTypeConfigUtils.getMediaTypeConfig(presenterData.getCurrentConfig(), clazz);
    return config == null ? null : tabState.getConfigTabMapping().get(config.getDefaultSelectedTab());
  }

  protected void onOpenResolution(ILifeCycleDocumentItem document, String href) {
    onOpenExecutionContext(document, href, true);
  }

  protected void onOpenReport(ILifeCycleDocumentItem document, String href) {
    onOpenExecutionContext(document, href, false);
  }

  /**
   * onOpenExecutionContext
   * 
   * @param item
   * @param href
   * @param openResolution
   *          true - resolution, false - report
   */
  private void onOpenExecutionContext(ILifeCycleDocumentItem item, String href, boolean openResolution) {

    Class<? extends AbstractTab> tabType = item instanceof Order ? ExecutionTab.class : LifecycleTab.class;
    AbstractTab tab = getView().getParticularTab(tabType);
    if (tab == null) {
      return;
    }
    getView().selectTab(tabType, false);
    if (openResolution) {
      ((IExecutionLifeCycleTab) tab).setDataTabAndOpenResolution(item, href);
    }
    else {
      ((IExecutionLifeCycleTab) tab).setDataTabAndOpenReport(item, href);
    }
  }

  @Override
  public void historyLinkOpen(Operations requestAction, final String href) {
    final LifecycleTab tab = getView().getParticularTab(LifecycleTab.class);
    if (tab != null) {
      getView().selectTab(LifecycleTab.class);
      switch (requestAction) {
        case LIFE_CYCLE_REGISTERS:
          tab.selectTab(getCurrentMediaType(), null, HistoryRegTab.class, true);
          break;
        case LIFE_CYCLE_SIGNING:
          tab.selectTab(getCurrentMediaType(), null, HistorySignTab.class, true);
          break;
        case LIFE_CYCLE_VERIFIED:
          tab.selectTab(getCurrentMediaType(), null, HistoryVerifTab.class, true);
          break;
        case LIFE_CYCLE_OTHER:
          presenterData.getRestService().getData(IBean.class, new AsyncCallback<IBean>() {
            @Override
            public void onFailure(Throwable caught) {
              caught.printStackTrace();
            }

            @Override
            public void onSuccess(IBean result) {
              MediaType bean = systemState.getCurrentMediaType();
              if (result instanceof ApprovalCycle) {
                if (bean instanceof IHasHrefApproval) {
                  ((IHasHrefApproval) bean).setHrefApproval(href);
                }
                tab.setDataTabAndOpenApprove(bean);
              }
              else if (result instanceof Review) {
                if (bean instanceof IHasHrefApproval) {
                  ((IHasHrefApproval) bean).setHrefApproval(href);
                }
                tab.setDataTabAndOpenReview(bean, true);
              }
              else if (result instanceof Report) {
                tab.setDataTabAndOpenReport((ILifeCycleDocumentItem) systemState.getCurrentMediaType(), href);
              }
              else if (result instanceof Resolution) {
                tab.setDataTabAndOpenResolution((ILifeCycleDocumentItem) systemState.getCurrentMediaType(),
                    href);
              }
            }
          }, href);
          break;
        default:
          throw new IllegalArgumentException("Unsuported type for HistoryCustomEvent");
      }
    }
  }
}
